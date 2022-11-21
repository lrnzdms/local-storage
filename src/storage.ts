import { getDb } from "./db";

export interface IPayload { id: string, data: any, date: number }

export interface ILocalStorageOptions {
  identifier: string,
  deprecationTime?: number
}

export class LocalStorage {
  private _storeId: string = "files";
  private _db: Promise<IDBDatabase>;
  private _deprecation: number = 8.64e+7; // Defaults to one day!

  constructor(options: ILocalStorageOptions) {
    this._db = getDb(options.identifier);
    if (options.deprecationTime) {
      this._deprecation = options.deprecationTime
    }

    console.log("[Storage] Initialized local storage with deprecation time of ", this._deprecation);
  }

  add = async (id: string, data: any, customDate?: number) => {
    const store = await this._getStore("readwrite");
    const date = customDate || Date.now();
    const payload: IPayload = { id, data, date };
    store.add(payload);
  }

  get = async (id: string, remoteDate?: number): Promise<IPayload | undefined> => {

    const payload: IPayload = await this._getData(id);

    if (!payload) return;

    // Data is deprecated if it is older than deprecation time!
    let deprecated = payload.date < (Date.now() - this._deprecation);

    // Data is also deprecated if there is a remote date which is newer
    if (remoteDate) {
      deprecated = payload.date < remoteDate;
    }

    // Delete and return
    if (deprecated) {
      await this.del(id);
      return;
    }

    return payload;
  }

  del = async (id: string) => {
    const store = await this._getStore("readwrite");
    store.delete(id);
  }

  clean = async () => {
    const store = await this._getStore("readwrite");
    return new Promise<void>(res => {
      const req = store.clear();

      req.onsuccess = () => {
        res(undefined);
      };

      req.onerror = e => {
        console.error(e);
        res(undefined);
      }
    })
  }

  private _getData = async (id: string) => {
    const store = await this._getStore("readwrite");
    return new Promise<any | undefined>(res => {
      const req = store.get(id);

      req.onsuccess = () => {
        if (req.result && req.result.data) {
          res(req.result);
        } else {
          res(undefined);
        }
      };

      req.onerror = e => {
        console.error(e);
        res(undefined);
      }
    })
  }
  private _getStore = async (mode?: IDBTransactionMode) => {
    const db = await this._db;
    const transaction = db.transaction(this._storeId, mode);
    return transaction.objectStore(this._storeId);
  }
}
