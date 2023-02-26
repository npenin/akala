import { ServerHandler, serverHandlers, getOrCreateServerAndListen, getOrCreateSecureServerAndListen } from "@akala/commands";
import { NetConnectOpts } from "net";
import * as ws from 'ws'
import * as jsonrpcws from '@akala/json-rpc-ws';
import { Triggers } from '@akala/commands';

import https from 'https';
import http from 'http';
import { trigger } from "./triggers/http.js";
import { SecureContextOptions } from "tls";

serverHandlers.register<ServerHandler<NetConnectOpts>>('http', async (container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;
    server = http.createServer();

    container.register('$webServer', server);
    container.register('$masterRouter', container.attach(trigger, server));

    await new Promise<void>(async (resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(await getOrCreateServerAndListen(options, container), resolve);
    });
});

serverHandlers.register<ServerHandler<NetConnectOpts & SecureContextOptions>>('https', async (container, options) =>
{
    let server: https.Server;// | Http2SecureServer | Http2Server;

    const tlsServer = getOrCreateSecureServerAndListen(options, container)

    server = container.resolve('$webServer');
    if (server == null)
    {
        await serverHandlers.resolve<ServerHandler<NetConnectOpts>>('http')(container, tlsServer as unknown as NetConnectOpts);
        server = container.resolve('$webServer');
    }
});

serverHandlers.register<ServerHandler<NetConnectOpts>>('ws', async (container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    server = container.resolve('$webServer');
    if (server == null)
    {
        var stop = await serverHandlers.resolve<ServerHandler<NetConnectOpts>>('http')(container, options);
        server = container.resolve('$webServer');
    }

    const wsServer = new ws.WebSocketServer({ server });
    container.register('$wsServer', wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Triggers.jsonrpcws, new jsonrpcws.ws.SocketAdapter(socket));
    })

    return stop;
});


serverHandlers.register<ServerHandler<NetConnectOpts>>('wss', async (container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    server = container.resolve('$webServer');
    if (server == null)
    {
        var stop = await serverHandlers.resolve<ServerHandler<NetConnectOpts>>('https')(container, options);
        server = container.resolve('$webServer');
    }

    const wsServer = new ws.WebSocketServer({ server });
    container.register('$wssServer', wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Triggers.jsonrpcws, new jsonrpcws.ws.SocketAdapter(socket));
    })

    return stop;
});
