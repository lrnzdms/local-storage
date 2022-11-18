import { LocalStorage } from "./localStorage";

export interface FileCacheEntry { id: string, name: string, blob: Blob, modified: boolean };

export class FileCache {
  private _backend: any;
  private entries: FileCacheEntry[] = [];
  private deletionCandidates: { id: string, name: string }[] = [];
  _loader: FileLoadHandler;
  _collectionId: string;
  _localStorage:LocalStorage;

  constructor(collectionId: string, callback: (payload: FileLoad[]) => void, backend: any) {
    this._collectionId = collectionId;
    this._backend = backend;
    this._loader = new FileLoadHandler(callback);
    this._localStorage = new LocalStorage({identifier: "foo"});
  }

  get = (id: string, name: string): Blob | undefined => {
    const entry = this.entries.find(f => f.id === id && f.name === name);
    return entry?.blob;
  }

  set = (id: string, name: string, blob: Blob, forceUnmodified?: boolean) => {
    const cached = this.entries.find(f => f.id === id && f.name === name);
    const modified = forceUnmodified ? false : true;
    if (cached) {
      cached.blob = blob;
      cached.modified = modified;
    } else {
      this.entries.push({ id, name, blob, modified });
    }

    // unmark deletion if there is one
    this.deletionCandidates = this.deletionCandidates.filter(e => !(e.id === id && e.name === name));
  }

  load = (id: string, fileName: string, silent?: boolean, responseType?: string, remoteDate?: number): Promise<Blob | ArrayBuffer> => {

    // Check if already in cache
    const cached = this.get(id, fileName);
    if (cached) {
      if (responseType === "arraybuffer") {
        return cached.arrayBuffer();
      } else {
        return Promise.resolve(cached);
      }
    }

    // Check if already loading
    const loadingBlob = this._loader.get(id, fileName);
    if (loadingBlob) {
      if (responseType === "arraybuffer") {
        return loadingBlob.then(b => b.arrayBuffer());
      } else {
        return loadingBlob;
      }
    }

    const promise = new Promise<Blob>(async (res, rej) => {
      try {

        let blob: Blob | void;

        // Check the local storage first
        blob = await this._getLocal(id, fileName, remoteDate);

        if (!blob) {

          const response = await this._backend.getFile(this._collectionId, id, fileName, "blob");
          const { data } = response;

          this._setLocal(id, fileName, data);

          blob = data as Blob;
        }

        this.set(id, fileName, blob, true);
        this._loader.remove(id, fileName);

        res(blob);

      } catch (error) {

        console.warn("ERROR TRYING TO LOAD FILE: ", id, fileName);
        this._loader.remove(id, fileName);
        rej(error);

      }

    });

    this._loader.add(id, fileName, promise, silent || false);

    if (responseType === "arraybuffer") {
      return promise.then((blob: Blob) => blob.arrayBuffer());
    }

    return promise;
  }

  markForDeletion = (id: string, name: string) => {
    // remove from cache
    this.entries = this.entries.filter(e => !(e.id === id && e.name === name));

    // mark for deletion
    if (!this.deletionCandidates.includes({ id, name })) {
      this.deletionCandidates.push({ id, name });
    }
  }

  sync = async () => {

    const updated: { id: string, file: File }[] = [];

    this.entries.filter(e => e.modified).forEach(e => {
      updated.push({ id: e.id, file: new File([e.blob], e.name) });
      e.modified = false;
    });

    const updatePromises = updated.map(u => this._backend.updateFile(this._collectionId, u.id, u.file));
    await Promise.all(updatePromises);

    const deleted = this.deletionCandidates.map(d => d);
    this.deletionCandidates = [];

    const deletePromises = deleted.map(d => this._backend.deleteFile(this._collectionId, d.id, d.name));
    await Promise.all(deletePromises);
  }

  private _getLocal = async (id: string, fileName: string, remoteDate?: number) => {
    const localId = `${this._collectionId}_${id}_${fileName}`;
    const local = await this._localStorage.get(localId, remoteDate);

    return local?.data as Blob;
  }

  private _setLocal = (id: string, fileName: string, data: Blob) => {
    const localId = `${this._collectionId}_${id}_${fileName}`;
    this._localStorage.add(localId, data);
  }
}

export interface FileLoad { id: string, fileName: string }

class FileLoadHandler {
  private _fileLoading: { id: string, name: string, blob: Promise<Blob>, silent: boolean }[] = [];
  private _callback: (payload: FileLoad[]) => void;
  constructor(callback: (payload: FileLoad[]) => void) {
    this._callback = callback;
  }

  get = (id: string, name: string): Promise<Blob> | undefined => {
    const loading = this._fileLoading.find(f => f.id === id && f.name === name);
    return loading?.blob;
  }

  add = (id: string, name: string, blob: Promise<Blob>, silent: boolean) => {
    this._fileLoading.push({ id, name, blob, silent });

    if (!silent) {
      this._announce();
    }
  }

  remove = (id: string, name: string) => {
    const entry = this._fileLoading.find(e => (e.id === id && e.name === name));

    // Do not filter if nothing is found
    if (!entry) return;

    this._fileLoading = this._fileLoading.filter(e => !(e.id === id && e.name === name));

    if (!entry.silent) {
      this._announce();
    }
  }

  _announce = () => {
    const payload = this._fileLoading
      .filter(f => !f.silent)
      .map(f => ({ id: f.id, fileName: f.name }));

    this._callback(payload);
  }
}

