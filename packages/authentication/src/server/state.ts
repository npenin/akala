import { AuthenticationStore } from './authentication-store.js';

export interface State
{
    router: import("@akala/server").HttpRouter;
    getHash: (value: string) => string;
    store: AuthenticationStore;
}