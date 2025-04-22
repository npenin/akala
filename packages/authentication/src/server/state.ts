import { AuthenticationStore } from './authentication-store.js';

export interface State
{
    cryptoKey: CryptoKey;
    router: import("@akala/server").HttpRouter;
    getHash: (value: string, salt?: Uint8Array) => Promise<string>;
    verifyHash: (value: string, signature: Uint8Array, salt?: Uint8Array) => Promise<boolean>;
    store: AuthenticationStore;
    session: {
        slidingExpiration?: number
        timeout?: number;
    }
}
