import { Server, Socket } from 'net';
import { platform } from 'os';
import * as ws from 'ws'
import { Container } from '../model/container';
import { join } from 'path';
import * as jsonrpcws from '@akala/json-rpc-ws';
import { EventEmitter } from 'events';
import { unlink } from 'fs';
import { Http2SecureServer, Http2Server } from 'http2';
import { Server as httpServer } from 'http'
import { Server as httpsServer } from 'https'

export class NetSocketAdapter implements jsonrpcws.SocketAdapter
{
    constructor(private socket: Socket)
    {
        socket.setNoDelay(true);
    }

    private buffer: string = '';
    private dataEventRegistered: boolean = false;
    private ee = new EventEmitter();

    private registerDataEvent()
    {
        if (!this.dataEventRegistered)
        {
            this.dataEventRegistered = true;
            this.socket.on('data', (data) =>
            {
                var sData: string = data as any;
                if (Buffer.isBuffer(data))
                    sData = data.toString('utf8');


                var indexOfEOL = sData.indexOf('}\n');
                while (indexOfEOL > -1)
                {
                    this.ee.emit('message', this.buffer + sData.substr(0, indexOfEOL + 1));
                    sData = sData.substr(indexOfEOL + 2);
                    this.buffer = '';
                    indexOfEOL = sData.indexOf('}\n');
                }

                this.buffer = this.buffer + sData;
            })
        }

    }

    get open()
    {
        return this.socket && (this.socket.readable || this.socket.writable);
    };
    close(): void
    {
        this.socket.end();
    }
    send(data: string): void
    {
        this.socket.write(data + '\n');
    }
    on(event: "message", handler: (this: any, ev: MessageEvent) => void): void;
    on(event: "open", handler: (this: any) => void): void;
    on(event: "error", handler: (this: any, ev: Event) => void): void;
    on(event: "close", handler: (this: any, ev: CloseEvent) => void): void;
    on(event: "message" | "open" | "error" | "close", handler: (ev?: any) => void): void
    {
        switch (event)
        {
            case 'message':
                this.registerDataEvent();
                this.ee.on('message', handler);
                break;
            case 'open':
                this.socket.on('connect', handler);
                break;
            case 'error':
                this.socket.on('error', handler);
                break;
            case 'close':
                this.socket.on('close', handler);
                break;
        }
    }
    once(event: "message", handler: (this: any, ev: MessageEvent) => void): void;
    once(event: "open", handler: (this: any) => void): void;
    once(event: "error", handler: (this: any, ev: Event) => void): void;
    once(event: "close", handler: (this: any, ev: CloseEvent) => void): void;
    once(event: "message" | "open" | "error" | "close", handler: (ev?: any) => void): void
    {
        switch (event)
        {
            case 'message':
                this.registerDataEvent();
                this.ee.once('message', handler);
                break;
            case 'open':
                this.socket.once('connect', handler);
                break;
            case 'error':
                this.socket.once('error', handler);
                break;
            case 'close':
                this.socket.once('close', handler);
                break;
        }
    }
}

export interface ServeOptions
{
    port?: number;
    tcpPort?: number;
    cert?: string;
    key?: string;
    _: ('local' | 'http' | 'ws' | 'tcp')[];
}

export default async function <T = void>(container: Container<T>, options: ServeOptions)
{
    var args = options._;
    if (!args || args.length == 0)
        args = ['local'];

    var stops: (() => Promise<void>)[] = [];

    if (args.indexOf('local') > -1 || args.indexOf('tcp') > -1)
    {
        let server = new Server((socket) =>
        {
            socket.setDefaultEncoding('utf8');
            container.attach('jsonrpc', new NetSocketAdapter(socket));
        });

        if (args.indexOf('local') > -1)
        {
            var socketPath: string;
            if (platform() == 'win32')
                socketPath = '\\\\?\\pipe\\' + container.name.replace(/\//g, '\\');
            else
                socketPath = join(process.cwd(), container.name.replace(/\//g, '-').replace(/^@/g, '') + '.sock');

            server.listen(socketPath);
            console.log(`listening on ${socketPath}`);
        }
        if (args.indexOf('tcp') > -1)
        {
            server.listen(options.tcpPort || 1337);
            console.log(`listening on ${options.tcpPort || 1337}`);
        }

        stops.push(() =>
        {
            return new Promise((resolve, reject) =>
            {
                server.close(function (err)
                {
                    if (err)
                        reject(err);
                    else
                        unlink(socketPath, function (err)
                        {
                            if (err)
                                reject(err);
                            else
                                resolve();
                        });
                })
            });
        });
    }

    if (args.indexOf('http') > -1 || args.indexOf('ws') > -1)
    {
        let port: number;
        let message = 'listening on ';
        if (options.port)
            port = options.port;
        else
        {
            if (options.cert && options.key)
                port = 443
            else
                port = 80;
        }
        let server: httpServer | httpsServer;// | Http2SecureServer | Http2Server;
        if (options.cert && options.key)
        {
            const https = await import('https');
            server = https.createServer({ cert: options.cert, key: options.key });
            message += 'https://';
        }
        else
        {
            const http = await import('http');
            server = http.createServer();
            message += 'http://';
        }
        container.register('$webServer', server);

        if (args.indexOf('http') > -1)
            container.register('$masterRouter', container.attach('http', server));
        if (args.indexOf('ws') > -1)
        {
            var wsServer = new ws.Server({ server });
            container.register('$wsServer', wsServer);
            wsServer.on('connection', (socket: ws) =>
            {
                container.attach('jsonrpc', new jsonrpcws.ws.SocketAdapter(socket));
            })
        }
        server.listen(port);
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


    console.log('server listening');

    return function ()
    {
        return Promise.all(stops.map(i => i()));
    }
}

exports.default.$inject = ['container', 'options'];