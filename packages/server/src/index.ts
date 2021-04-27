import './translator';
export { router, Request, Response, HttpRouter, CallbackResponse } from './router/index.js';

import './http'
export * from './http.js'

import container from './commands.js'
export { container }
export { State } from './state.js'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _pm from '@akala/pm'
declare module '@akala/pm'
{
    interface SidecarMap
    {
        '@akala/server': Promise<container.container & Container<void>>;
    }
}

import * as commands from '@akala/commands'
import { Container } from '@akala/commands';

export function connect(options: commands.ServeMetadata, settings: {
    preferRemote?: boolean;
    host?: string;
}, ...orders: (keyof commands.ServeMetadata)[])
    : Promise<{
        container: container.container;
        processor: commands.CommandProcessors;
    }>
{
    if (!settings)
        settings = {};
    return commands.connectByPreference(options, Object.assign({ container: require('../commands.json') }, settings), ...orders);
}

export { Logger, logger, log } from './logger.js'