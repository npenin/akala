import './translator';
export { router, Request, Response, HttpRouter, CallbackResponse } from './router/index';

import './http'
import './handlers'
export * from './http'

export * from './queue'

import container from './commands'
export { container }
export { State } from './state'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as _pm from '@akala/pm'
declare module '@akala/pm'
{
    interface SidecarMap
    {
        '@akala/server': container.container;
    }
}

export { trigger } from './triggers/http'

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