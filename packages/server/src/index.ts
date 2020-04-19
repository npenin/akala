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

import { description } from './commands'
export { description }

import * as commands from '@akala/commands'
export function connect(socket: net.Socket): commands.Container<void> & description.commands
{
    return commands.proxy(require('../commands.json'), c => new commands.Processors.JsonRpc(commands.Processors.JsonRpc.getConnection(new commands.NetSocketAdapter(socket), c)));
}

export { Logger, logger, log } from './logger'