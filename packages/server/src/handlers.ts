import { serverHandlers } from "@akala/commands";
import { NetConnectOpts } from "net";
import * as ws from 'ws'
import * as jsonrpcws from '@akala/json-rpc-ws';

import https from 'https';
import http, { ServerOptions } from 'http';
import { trigger } from "./triggers/http.js";
import { Processors } from "@akala/commands";
import http2, { Http2Server } from "http2";

serverHandlers.useProtocol('http', async (url, container, options: (ServerOptions) & { signal: AbortSignal }) =>
{
    const server: http.Server = http.createServer(options);

    container.register('$webServer', server);
    container.register('$masterRouter', container.attach(trigger, server));

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);

        if (url.pathname)
            server.listen(url.host + url.pathname, resolve);
        options.signal.addEventListener('abort', () => { server.close(); server.closeAllConnections(); });
    });
});
serverHandlers.useProtocol('http2', async (url, container, options: (http2.ServerOptions) & { signal: AbortSignal }) =>
{
    const server: Http2Server = http2.createServer(options);

    container.register('$webServer', server);
    container.register('$masterRouter', container.attach(trigger, server));

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);

        if (url.pathname)
            server.listen(url.host + url.pathname, resolve);
        else
            server.listen({ host: url.hostname, port: url.port }, resolve)
        options.signal.addEventListener('abort', () => { server.close(); });
    });
});

serverHandlers.useProtocol<https.ServerOptions | http2.ServerOptions>('https', async (url, container, options,) =>
{
    // let server: https.Server | Http2SecureServer | Http2Server;

    const server = http2.createSecureServer(options)

    container.register('$webServer', server);
    container.register('$masterRouter', container.attach(trigger, server));

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);

        if (url.pathname)
            server.listen(url.host + url.pathname, resolve);
        options.signal.addEventListener('abort', () => { server.close(); });
    });
});

serverHandlers.useProtocol<NetConnectOpts>('ws', async (url, container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    server = container.resolve('$webServer');
    if (server == null)
    {
        await serverHandlers.process(new URL(url.toString().replace(/^ws:/, 'http:')), container, options);
        server = container.resolve('$webServer');
    }

    const wsServer = new ws.WebSocketServer({ server });
    container.register('$wsServer', wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Processors.JsonRpc.trigger, new jsonrpcws.ws.SocketAdapter(socket));
    })
});


serverHandlers.useProtocol<NetConnectOpts>('wss', async (url, container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    server = container.resolve('$webServer');
    if (server == null)
    {
        await serverHandlers.process(new URL(url.toString().replace(/^wss:/, 'https:')), container, options);
        server = container.resolve('$webServer');
    }

    const wsServer = new ws.WebSocketServer({ server });
    container.register('$wssServer', wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Processors.JsonRpc.trigger, new jsonrpcws.ws.SocketAdapter(socket));
    })
});
