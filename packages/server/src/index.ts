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
export { State } from './state'

import * as commands from '@akala/commands'
import { Container } from '@akala/commands';

export async function connect(socket: net.NetConnectOpts, container?: commands.Container<any>): Promise<commands.Container<void> & description.commands>
{
    var metaContainer: commands.Metadata.Container = require('../commands.json');
    if (!container)
        container = new Container(metaContainer.name, undefined);
    var processor = await commands.connectWith(socket, socket['host'], 'socket', container);
    commands.registerCommands(metaContainer.commands, processor, container);
    return container;
}

export { Logger, logger, log } from './logger'