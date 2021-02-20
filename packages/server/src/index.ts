import './translator';
export { router, wrouter, Request, Response, HttpRouter, CallbackResponse } from './router';
export * from './helpers/mkdirp';

import './http'
export * from './http'
import * as worker from './worker-meta'
export { worker };
import * as master from './master-meta';
export { master };
import * as net from 'net'

export type resolve = worker.resolve;

import description from './commands'
export { description }
export { State } from './state'

import * as commands from '@akala/commands'

export function connect(options: commands.ServeMetadata, settings: {
    preferRemote?: boolean;
    host?: string;
}, ...orders: (keyof commands.ServeMetadata)[])
    : Promise<{
        container: description;
        processor: commands.CommandProcessors<any>;
    }>
{
    if (!settings)
        settings = {};
    return commands.connectByPreference(options, Object.assign({ container: require('../commands.json') }, settings), ...orders);
}

export { Logger, logger, log } from './logger'