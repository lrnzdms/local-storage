"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LocalStorage = void 0;
const db_1 = require("./db");
class LocalStorage {
    constructor(options) {
        this._storeId = "files";
        this._deprecation = 8.64e+7; // Defaults to one day!
        this.add = async (id, data, customDate) => {
            const store = await this._getStore("readwrite");
            const date = customDate || Date.now();
            const payload = { id, data, date };
            store.add(payload);
        };
        this.get = async (id, remoteDate) => {
            const payload = await this._getData(id);
            if (!payload)
                return;
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
        };
        this.del = async (id) => {
            const store = await this._getStore("readwrite");
            store.delete(id);
        };
        this.clean = async () => {
            const store = await this._getStore("readwrite");
            return new Promise(res => {
                const req = store.clear();
                req.onsuccess = () => {
                    res(undefined);
                };
                req.onerror = e => {
                    console.error(e);
                    res(undefined);
                };
            });
        };
        this._getData = async (id) => {
            const store = await this._getStore("readwrite");
            return new Promise(res => {
                const req = store.get(id);
                req.onsuccess = () => {
                    if (req.result && req.result.data) {
                        res(req.result);
                    }
                    else {
                        res(undefined);
                    }
                };
                req.onerror = e => {
                    console.error(e);
                    res(undefined);
                };
            });
        };
        this._getStore = async (mode) => {
            const db = await this._db;
            const transaction = db.transaction(this._storeId, mode);
            return transaction.objectStore(this._storeId);
        };
        this._db = db_1.getDb(options.identifier);
        if (options.deprecationTime) {
            this._deprecation = options.deprecationTime;
        }
        console.log("[Storage] Initialized local storage with deprecation time of ", this._deprecation);
    }
}
exports.LocalStorage = LocalStorage;
