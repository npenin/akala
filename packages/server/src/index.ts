import './translator';
export { router, wrouter, Request, Response, HttpRouter, CallbackResponse } from './router';
export * from './helpers/mkdirp';

import './http'
export * from './http'
import * as worker from './worker-meta'
export { worker };
import * as master from './master-meta';
export { master };

export type resolve = worker.resolve;

import container from './commands'
export { container }
export { State } from './state'

import * as pm from '@akala/pm'
declare module '@akala/pm'
{
    interface SidecarMap
    {
        '@akala/server': container & Container<void>;
    }
}

import * as commands from '@akala/commands'
import { Container } from '@akala/commands';

export function connect(options: commands.ServeMetadata, settings: {
    preferRemote?: boolean;
    host?: string;
}, ...orders: (keyof commands.ServeMetadata)[])
    : Promise<{
        container: container;
        processor: commands.CommandProcessors<any>;
    }>
{
    if (!settings)
        settings = {};
    return commands.connectByPreference(options, Object.assign({ container: require('../commands.json') }, settings), ...orders);
}

export { Logger, logger, log } from './logger'