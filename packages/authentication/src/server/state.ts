import { AuthenticationStore } from './authentication-store.js';

export interface State
{
    router: import("@akala/server").HttpRouter;
    getHash: (value: string, salt?: ArrayBufferLike) => Promise<string>;
    verifyHash: (value: string, signature: BufferSource, salt?: ArrayBufferLike) => Promise<boolean>;
    store: AuthenticationStore;
    session: {
        slidingExpiration?: number
        timeout?: number;
    }
}