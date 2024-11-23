import './translator.js';
export { router, Request, Response, HttpRouter, CallbackResponse } from './router/index.js';

import './http.js'
import './handlers.js'
export * from './http.js'

export * from './queue.js'

import container from './commands.js'
export { container }
export { State } from './state.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as _pm from '@akala/pm'
import { connectByPreference, ConnectionPreference, ICommandProcessor } from '@akala/commands';
import { ServeMetadata } from '@akala/commands';
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
    return connectByPreference(options, Object.assign({ metadata: container.meta }, settings), ...orders);
}

// export { Logger, logger, log } from '@akala/core/src/logger'