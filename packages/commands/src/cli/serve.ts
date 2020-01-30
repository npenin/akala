import { Server, Socket } from 'net';
import { platform } from 'os';
import * as ws from 'ws'
import { Container } from '../container';
import { join } from 'path';
import * as jsonrpcws from '@akala/json-rpc-ws';
import { EventEmitter } from 'events';

export class NetSocketAdapter implements jsonrpcws.SocketAdapter
{
    constructor(private socket: Socket)
    {

    }

    private buffer: Buffer | null = null;
    private dataEventRegistered: boolean = false;
    private ee = new EventEmitter();

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
                if (!this.dataEventRegistered)
                {
                    this.dataEventRegistered = true;
                    this.socket.on('data', (data) =>
                    {
                        if (!this.buffer)
                            this.buffer = data;
                        else
                            this.buffer = Buffer.concat([this.buffer, data]);
                        if (this.buffer.toString('utf8', this.buffer.length - 2) == '}\n')
                        {
                            this.ee.emit('message', this.buffer.toString('utf8'));
                        }
                    })
                }
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
                if (!this.dataEventRegistered)
                {
                    this.dataEventRegistered = true;
                    this.socket.on('data', (data) =>
                    {
                        if (!this.buffer)
                            this.buffer = data;
                        else
                            this.buffer = Buffer.concat([this.buffer, data]);
                        if (this.buffer.toString('utf8', this.buffer.length - 2) == '}\n')
                        {
                            this.ee.emit('message', this.buffer.toString('utf8'));
                        }
                    })
                }
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

export default async function (container: Container<void>, options: { port?: number, cert?: string, key?: string, _: ('local' | 'http' | 'ws')[] })
{
    var args = options._;
    if (!args || args.length == 0)
        args = ['local'];

    if (args.indexOf('local') > -1)
    {
        let server = new Server((socket) =>
        {
            socket.setDefaultEncoding('utf8');
            container.attach('jsonrpc', new NetSocketAdapter(socket));
        });

        if (platform() == 'win32')
            server.listen('\\\\?\\pipe\\' + container.name.replace(/\//g, '\\'))
        else
            server.listen(join(process.cwd(), container.name.replace(/\//g, '-') + '.sock'));
    }
    if (args.indexOf('http') > -1 || args.indexOf('ws') > -1)
    {
        let port: number;
        if (options.port)
            port = options.port;
        else
        {
            if (options.cert && options.key)
                port = 443
            else
                port = 80;
        }
        if (options.cert && options.key)
        {
            const https = await import('https');
            let server = https.createServer({ cert: options.cert, key: options.key });
            if (args.indexOf('http') > -1)
                container.attach('http', server);
            if (args.indexOf('ws') > -1)
            {
                var wsServer = new ws.Server({ server });
                wsServer.on('connection', (socket: ws) =>
                {
                    container.attach('jsonrpc', new jsonrpcws.ws.SocketAdapter(socket, false));
                })
            }
            server.listen(port);
        }
        else
        {
            const http = await import('http');
            let server = http.createServer();
            if (args.indexOf('http') > -1)
                container.attach('http', server);
            if (args.indexOf('ws') > -1)
            {
                var wsServer = new ws.Server({ server });
                wsServer.on('connection', (socket: ws) =>
                {
                    container.attach('jsonrpc', new jsonrpcws.ws.SocketAdapter(socket, false));
                })
            }
            server.listen(port);
        }
    }
    console.log('server listening');
}

exports.default.$inject = ['container', 'options'];