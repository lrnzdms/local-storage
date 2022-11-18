const w = (window as any);
const idb: IDBFactory = w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB || w.shimIndexedDB;

export const getDb = (database: string) => new Promise<IDBDatabase>((res, rej) => {

  const request = idb.open(database);

  request.onupgradeneeded = () => {
    let db = request.result;
    if (!db.objectStoreNames.contains("files")) {
      db.createObjectStore('files', { keyPath: 'id' });
    }
  }

  request.onerror = () => {
    console.error(request.error);
    rej("Could not create local storage.");
  }

  
  request.onsuccess = () => {
    res(request.result);
  }
})

