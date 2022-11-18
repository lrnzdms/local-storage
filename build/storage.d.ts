export interface IPayload {
    id: string;
    data: any;
    date: number;
}
export interface ILocalStorageOptions {
    identifier: string;
    deprecationTime?: number;
}
export declare class LocalStorage {
    private _storeId;
    private _db;
    private _deprecation;
    constructor(options: ILocalStorageOptions);
    add: (id: string, data: any, customDate?: number) => Promise<void>;
    get: (id: string, remoteDate?: number) => Promise<IPayload | undefined>;
    del: (id: string) => Promise<void>;
    clean: () => Promise<void>;
    private _getData;
    private _getStore;
}
