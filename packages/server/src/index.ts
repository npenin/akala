import './translator.js';
export { router, Request, Response, HttpRouter, CallbackResponse } from './router/index.js';

import './http.js'
export * from './http.js'

export * from './queue.js'

import container from './commands.js'
export { container }
export { State } from './state.js'

import type * as _pm from '@akala/pm'
import { connectByPreference, ConnectionPreference, ICommandProcessor, ServeMetadata } from '@akala/commands';
import { HttpRouter } from './router/router.js';
import { serverHandlers } from './handlers.js';
import { StaticFileMiddleware } from './router/staticFileMiddleware.js';
export { serverHandlers };

declare module '@akala/pm'
{
    interface SidecarMap
    {
        '@akala/server': container.container;
    }
}

export { trigger } from './triggers/http.js'

export function connect(options: ServeMetadata, settings: ConnectionPreference, ...orders: (keyof ServeMetadata)[])
    : Promise<{
        container: container.container;
        processor: ICommandProcessor;
    }>
{
    if (!settings)
        settings = { metadata: container.meta, container: null };
    return connectByPreference(options, { metadata: container.meta, ...settings }, ...orders);
}

export async function serve(options: { staticFolders?: string[], urls: string[], signal: AbortSignal })
{
    const router = new HttpRouter();

    await Promise.all(options.urls.map(async url =>
    {
        const server = await serverHandlers.process(new URL(url), { signal: options.signal });
        router.attachTo(server);
    }));

    if (options.staticFolders)
        options.staticFolders.forEach(folder => router.useMiddleware(new StaticFileMiddleware(folder)));

    return router;
}
