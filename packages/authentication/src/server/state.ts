import { AuthenticationStore } from './authentication-store.js';

export interface State
{
    router: import("@akala/server").HttpRouter;
    getHash: (value: string) => Promise<string>;
    store: AuthenticationStore;
    session: {
        slidingExpiration?: number
        timeout?: number;
    }
}