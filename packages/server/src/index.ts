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

export { description } from './commands'

import * as commands from '@akala/commands'
import { Container } from '@akala/commands';
export function connect(socket: net.Socket)
{
    var container = new Container('', null);
    commands.proxy(require('../commands.json'), new commands.Processors.JsonRpc(commands.Processors.JsonRpc.getConnection(new commands.NetSocketAdapter(socket), container)));
    return container;
}

export { Logger, logger, log } from './logger'