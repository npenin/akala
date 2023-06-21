import { Socket } from 'net';
import { TLSSocket, connect as tlsconnect } from 'tls'
import * as jsonrpcws from '@akala/json-rpc-ws';
import { EventEmitter } from 'events';
import { addHandler } from './protocol-handler.js';
import { JsonRpc } from './processors/jsonrpc.js';
import { Command } from './metadata/command.js';

addHandler('tcp', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ port: url.port && Number(url.port) || 31416, host: url.hostname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection, true), getMetadata: () => new Promise<Command[]>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata.commands) : reject(err)
        ))
    };
});

addHandler('tcps', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ port: url.port && Number(url.port) || 31416, host: url.hostname, servername: url.hostname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection, true), getMetadata: () => new Promise<Command[]>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

addHandler('unix', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ path: url.hostname + url.pathname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection, true), getMetadata: () => new Promise<Command[]>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});


addHandler('unixs', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ path: url.hostname + url.pathname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection, true), getMetadata: () => new Promise<Command[]>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

export class NetSocketAdapter implements jsonrpcws.SocketAdapter
{
    constructor(private socket: Socket)
    {
        socket.setNoDelay(true);
    }

    off<K extends keyof jsonrpcws.SocketAdapterEventMap>(event: K, handler?: (this: unknown, ev: jsonrpcws.SocketAdapterEventMap[K]) => void): void
    {
        if (event == 'message')
            if (handler)
                this.ee.removeListener(event, handler);
            else
                this.ee.removeAllListeners(event);
        else if (handler)
            this.socket.removeListener(event, handler);
        else
            this.socket.removeAllListeners(event);
    }

    pipe(socket: jsonrpcws.SocketAdapter<unknown>)
    {
        if (socket instanceof NetSocketAdapter)
        {
            this.socket.pipe(socket.socket);
            return;
        }
        this.on('message', (message) => socket.send(message));
        this.on('close', () => socket.close());
    }

    private buffer = '';
    private dataEventRegistered = false;
    private ee = new EventEmitter();

    private registerDataEvent()
    {
        if (!this.dataEventRegistered)
        {
            this.dataEventRegistered = true;
            this.socket.on('data', (data) =>
            {
                let sData: string = data as unknown as string;
                if (Buffer.isBuffer(data))
                    sData = data.toString('utf8');


                let indexOfEOL = sData.indexOf('}\n');
                while (indexOfEOL > -1)
                {
                    this.ee.emit('message', this.buffer + sData.substr(0, indexOfEOL + 1));
                    sData = sData.substr(indexOfEOL + 2);
                    this.buffer = '';
                    indexOfEOL = sData.indexOf('}\n');
                }

                this.buffer = this.buffer + sData;
            });
        }

    }

    get open(): boolean
    {
        return this.socket && (this.socket.readable || this.socket.writable);
    }
    close(): void
    {
        this.socket.end();
    }
    send(data: string): void
    {
        this.socket.write(data + '\n');
    }
    on(event: "message", handler: (this: unknown, ev: string) => void): void;
    on(event: "open", handler: (this: unknown) => void): void;
    on(event: "error", handler: (this: unknown, ev: Event) => void): void;
    on(event: "close", handler: (this: unknown, ev: CloseEvent) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    once(event: "message", handler: (this: unknown, ev: MessageEvent) => void): void;
    once(event: "open", handler: (this: unknown) => void): void;
    once(event: "error", handler: (this: unknown, ev: Event) => void): void;
    once(event: "close", handler: (this: unknown, ev: CloseEvent) => void): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
