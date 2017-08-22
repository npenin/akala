import * as jsonrpc from 'json-rpc-ws'
import * as ws from 'ws'
import * as router from '../router'
import * as akala from '@akala/core';

var log = akala.log('akala:jsonrpc');

export function createServer<TConnection extends jsonrpc.Connection>(router: router.HttpRouter, path: string)
{
    var server = jsonrpc.createServer<TConnection>();
    var wss = server.server = new ws.Server({ noServer: true, clientTracking: true })

    wss.on('connection', function (...args)
    {
        log('received connection');
        debugger;
        server.connected.apply(server, args);
    });

    router.upgrade(path, 'websocket', function (request, socket, head)
    {
        log('received upgrade request');
        wss.handleUpgrade(request, socket, head, client =>
        {
            log('emitting connection event');
            wss.emit('connection', client, request);
        });
    });

    return server;
}