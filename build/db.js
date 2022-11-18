"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDb = void 0;
const w = window;
const idb = w.indexedDB || w.mozIndexedDB || w.webkitIndexedDB || w.msIndexedDB || w.shimIndexedDB;
const getDb = (database) => new Promise((res, rej) => {
    const request = idb.open(database);
    request.onupgradeneeded = () => {
        let db = request.result;
        if (!db.objectStoreNames.contains("files")) {
            db.createObjectStore('files', { keyPath: 'id' });
        }
    };
    request.onerror = () => {
        console.error(request.error);
        rej("Could not create local storage.");
    };
    request.onsuccess = () => {
        res(request.result);
    };
});
exports.getDb = getDb;
