import { Trigger } from '../model/trigger.js'
import { Container } from '../model/container.js';
import { SocketAdapter } from '@akala/json-rpc-ws';
import { JsonRpc } from '../processors/index.js';
import { logger } from '@akala/core';


export const trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: SocketAdapter)
{
    // assert.ok(media instanceof ws.SocketAdapter, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
    const log = logger('akala:commands:jsonrpc:' + container.name)
    return JsonRpc.getConnection(media, container, null, log);
})

