import { AuthenticationStore } from './authentication-store.js';

export interface State
{
    router: import("@akala/server").HttpRouter;
    getHash: (value: string, salt?: Uint8Array) => Promise<string>;
    verifyHash: (value: string, signature: BufferSource, salt?: Uint8Array) => Promise<boolean>;
    store: AuthenticationStore;
    session: {
        slidingExpiration?: number
        timeout?: number;
    }
}