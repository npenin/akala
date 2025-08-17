import { serverHandlers as commandHandlers, Processors } from "@akala/commands";
import { type NetConnectOpts } from "net";
import * as ws from 'ws'
import * as jsonrpcws from '@akala/json-rpc-ws';

import https from 'https';
import http, { type ServerOptions } from 'http';
import { trigger } from "./triggers/http.js";
import http2 from "http2";
import { HttpStatusCode, UrlHandler } from "@akala/core";
import { HttpRouter } from "./router/router.js";

export const serverHandlers = new UrlHandler<[URL, (http.ServerOptions | http2.ServerOptions | https.ServerOptions | http2.SecureServerOptions) & { signal: AbortSignal }, void], http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server>(true);

serverHandlers.useProtocol('http', async (url, options) =>
{
    const server: http.Server = http.createServer(options as http.ServerOptions);

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(Number(url.port), url.hostname, resolve);
        options.signal.addEventListener('abort', async () =>
        {
            await new Promise<void>((resolve, reject) => server.close(err =>
            {
                if (err)
                    reject(err);
                else
                    resolve();
            }));
            if (options.signal.reason !== 'SIGINT')
                server.closeAllConnections();
            server.unref();
        });
    });

    return server;
});

serverHandlers.useProtocol('http2', async (url, options) =>
{
    const server: http2.Http2Server = http2.createServer(options as http2.ServerOptions);

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(Number(url.port), url.hostname, resolve);
        options.signal.addEventListener('abort', async () =>
        {
            await new Promise<void>((resolve, reject) => server.close(err =>
            {
                if (err)
                    reject(err);
                else
                    resolve();
            }));
            server.unref();
        });
    });
    console.log(`server listening on http2://${url.hostname}:${url.port}`);

    return server;
});
serverHandlers.useProtocol('https', async (url, options) =>
{
    const server: https.Server = https.createServer(options as https.ServerOptions);

    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(Number(url.port), url.hostname, resolve);
        options.signal.addEventListener('abort', async () =>
        {
            await new Promise<void>((resolve, reject) => server.close(err =>
            {
                if (err)
                    reject(err);
                else
                    resolve();
            }));
            if (options.signal.reason !== 'SIGINT')
                server.closeAllConnections();
            server.unref();
        });
    });
    console.log(`server listening on https://${url.hostname}:${url.port}`);

    return server;
});
serverHandlers.useProtocol('http2s', async (url, options) =>
{
    const server: http2.Http2SecureServer = http2.createSecureServer(options as http2.SecureServerOptions);
    await new Promise<void>((resolve, reject) =>
    {
        server.once('error', reject);
        server.listen(Number(url.port), url.hostname, resolve);
        options.signal.addEventListener('abort', async () =>
        {
            await new Promise<void>((resolve, reject) => server.close(err =>
            {
                if (err)
                    reject(err);
                else
                    resolve();
            }));
            server.unref();
        });
    });
    console.log(`server listening on http2s://${url.hostname}:${url.port}`);

    return server;
});


commandHandlers.protocol.use(async (url, container, options: (ServerOptions) & { router?: HttpRouter, signal: AbortSignal }) =>
{
    let server: http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server;
    if (!(server = container.resolve('$webServer:' + url)))
    {
        try
        {
            server = await serverHandlers.process(url, options)
        }
        catch (e)
        {
            if (e?.statusCode == HttpStatusCode.NotFound)
                return Promise.reject();
            throw e;
        }
        container.register('$webServer:' + url, server);
    }
    if (!container.resolve('$mainRouter'))
        if (url.pathname.length > 1)
        {
            const router = new HttpRouter();
            router.attachTo(server);
            const containerRouter = router.useMiddleware(url.pathname, new HttpRouter());
            container.register('$mainRouter', container.attach(trigger, containerRouter));
        }
        else
            container.register('$mainRouter', container.attach(trigger, server));
});

commandHandlers.useProtocol<NetConnectOpts>('ws', async (url, container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    const webUrl = url.href.replace(/^ws:/, 'http:')

    server = container.resolve('$webServer:' + webUrl);
    if (server == null)
    {
        await commandHandlers.process(new URL(webUrl), container, options);
        server = container.resolve('$webServer:' + webUrl);
    }

    const wsServer = new ws.WebSocketServer({ server });
    options.signal?.addEventListener('abort', () => new Promise<void>((resolve, reject) => wsServer.close(err =>
    {
        if (err)
            reject(err);
        else
            resolve();
    })));
    container.register('$wsServer:' + url, wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Processors.JsonRpc.trigger, new jsonrpcws.JsonRpcSocketAdapter(new jsonrpcws.ws.SocketAdapter(socket)));
    })
});


commandHandlers.useProtocol<NetConnectOpts>('wss', async (url, container, options) =>
{
    let server: http.Server | https.Server;// | Http2SecureServer | Http2Server;

    const webUrl = url.href.replace(/^wss:/, 'https:');

    server = container.resolve('$webServer:' + webUrl);
    if (server == null)
    {
        await commandHandlers.process(new URL(webUrl), container, options);
        server = container.resolve('$webServer:' + webUrl);
    }

    const wsServer = new ws.WebSocketServer({ server });
    options.signal?.addEventListener('abort', () => new Promise<void>((resolve, reject) => wsServer.close(err =>
    {
        if (err)
            reject(err);
        else
            resolve();
    })));
    container.register('$wssServer:' + url, wsServer);
    wsServer.on('connection', (socket: ws.WebSocket) =>
    {
        container.attach(Processors.JsonRpc.trigger, new jsonrpcws.JsonRpcSocketAdapter(new jsonrpcws.ws.SocketAdapter(socket)));
    })
});
