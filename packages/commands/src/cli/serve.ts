import { Server } from 'net';
import * as ws from 'ws'
import { Container } from '../model/container';
import * as jsonrpcws from '@akala/json-rpc-ws';
import { unlink } from 'fs';
import { Server as httpServer } from 'http'
import { Server as httpsServer } from 'https'
import { ServeMetadata } from '../serve-metadata';
import https from 'https';
import http from 'http';
import { NetSocketAdapter } from '../net-socket-adapter';

export interface ServeOptions
{
    options: {
        port?: number;
        tcpPort?: string;
        cert?: string;
        key?: string;
    }
    args: ('local' | 'http' | 'ws' | 'tcp')[];
}

export default async function <T = void>(container: Container<T>, options: ServeMetadata)
{
    console.log(options);
    const stops: (() => Promise<void>)[] = [];
    var failed: Error = null;

    if (options.socket)
    {
        for (var socketPath of options.socket)
        {
            try
            {
                const server = new Server((socket) =>
                {
                    socket.setDefaultEncoding('utf8');
                    container.attach('jsonrpc', new NetSocketAdapter(socket));
                });

                await new Promise<void>((resolve, reject) =>
                {
                    server.once('error', reject);
                    server.listen(socketPath, resolve);
                });
                console.log(`listening on ${JSON.stringify(socketPath)}`);

                stops.push(() =>
                {
                    return new Promise((resolve, reject) =>
                    {
                        server.close(function (err)
                        {
                            if (err)
                                reject(err);
                            else
                                if (socketPath['path'])
                                    unlink(socketPath['path'], function (err)
                                    {
                                        if (err && err.code !== 'ENOENT')
                                            reject(err);
                                        else
                                            resolve();
                                    });
                        })
                    });
                });
            }
            catch (e)
            {
                console.error(e);
                failed = e;
            }
        }
    }

    if (options.http || options.https || options.ws || options.wss)
    {
        let server: httpServer | httpsServer;// | Http2SecureServer | Http2Server;
        let message = 'listening on ';
        let port: number;
        if (options.https || options.wss)
        {
            server = https.createServer({ cert: options.https.cert || options.wss.cert, key: options.https.key || options.wss.key });
            if (options.https)
            {
                message += 'https://';
                port = options.https.port;
            }
            else
            {
                message += 'wss://';
                port = options.wss.port;
            }
        }
        else
        {
            server = http.createServer();
            if (options.http)
            {
                message += 'http://';
                port = options.http.port;
            }
            else
            {
                message += 'ws://';
                port = options.http.port;
            }
        }
        container.register('$webServer', server);

        if (options.http || options.https)
            container.register('$masterRouter', container.attach('http', server));
        if (options.ws || options.wss)
        {
            const wsServer = new ws.Server({ server });
            container.register('$wsServer', wsServer);
            wsServer.on('connection', (socket: ws) =>
            {
                container.attach('jsonrpc', new jsonrpcws.ws.SocketAdapter(socket));
            })
        }
        try
        {
            await new Promise<void>((resolve, reject) =>
            {
                server.once('error', reject);
                server.listen(port, resolve);
            });

            console.log(message + '0.0.0.0:' + port);

            stops.push(() =>
            {
                return new Promise<void>((resolve, reject) =>
                {
                    server.close(function (err)
                    {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    })
                })
            })
        }
        catch (e)
        {
            console.error(e);
            failed = e;
        }
    }

    if (failed)
    {
        console.log(failed);
        console.log('exiting...');
        await Promise.all(stops.map(i => i()));
        throw failed;
    }
    else
        console.log('server listening');

    return function stop()
    {
        return Promise.all(stops.map(i => i()));
    }
}