import './translator';
export { router, Request, Response, HttpRouter, CallbackResponse } from './router/index.js';

import './http'
import './handlers'
export * from './http.js'

export * from './queue.js'

import container from './commands.js'
export { container }
export { State } from './state.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import type * as _pm from '@akala/pm'
declare module '@akala/pm'
{
    interface SidecarMap
    {
        '@akala/server': container.container;
    }
}

export { trigger } from './triggers/http.js'

import * as commands from '@akala/commands'

export function connect(options: commands.ServeMetadata, settings: {
    preferRemote?: boolean;
    host?: string;
}, ...orders: (keyof commands.ServeMetadata)[])
    : Promise<{
        container: container.container;
        processor: commands.ICommandProcessor;
    }>
{
    if (!settings)
        settings = {};
    return commands.connectByPreference(options, Object.assign({ metadata: require('../commands.json') }, settings), ...orders);
}

// export { Logger, logger, log } from '@akala/core/src/logger'