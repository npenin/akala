import { Socket } from 'net';
import { TLSSocket, connect as tlsconnect } from 'tls'
import { protocolHandlers as handlers } from './protocol-handler.js';
import { JsonRpc } from './processors/jsonrpc.js';
import { type Container } from './metadata/container.js';
import { type AllEventKeys, type AllEvents, EventEmitter, type EventListener, type EventOptions, IsomorphicBuffer, SocketAdapter, StatefulSubscription, type Subscription } from '@akala/core';
import { type SocketAdapterAkalaEventMap } from '@akala/core';

handlers.useProtocol('tcp', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ port: url.port && Number(url.port) || 31416, host: url.hostname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

handlers.useProtocol('tcps', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ port: url.port && Number(url.port) || 31416, host: url.hostname, servername: url.hostname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

handlers.useProtocol('unix', async (url) =>
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ path: url.hostname + url.pathname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});


handlers.useProtocol('unixs', async (url) =>
{
    const socket = await new Promise<TLSSocket>(resolve => { const socket = tlsconnect({ path: url.hostname + url.pathname }, () => resolve(socket)) });

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return {
        processor: new JsonRpc(connection), getMetadata: () => new Promise<Container>((resolve, reject) => connection.sendMethod<any, any>('$metadata', undefined, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

export class NetSocketAdapter extends EventEmitter<SocketAdapterAkalaEventMap> implements SocketAdapter
{
    constructor(private socket: Socket)
    {
        super();
        socket.setNoDelay(true);
    }


    public off<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): boolean
    {
        if (event == 'message')
            return super.off(event, handler)
        else if (handler)
            this.socket.removeListener(event, handler);
        else
            this.socket.removeAllListeners(event);

        return true;
    }

    pipe(socket: SocketAdapter)
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
                    this.emit('message', this.buffer + sData.substring(0, indexOfEOL + 1));
                    sData = sData.substring(indexOfEOL + 2);
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

    close()
    {
        return new Promise<void>(resolve => this.socket.end(resolve));
    }

    send(data: string | IsomorphicBuffer): Promise<void>
    {
        return new Promise<void>((resolve, reject) => this.socket.write(data instanceof IsomorphicBuffer ? data.toArray() : data, err => err ? reject(err) : resolve()));
    }

    public on<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        const sub = new StatefulSubscription(() => this.socket.removeListener(event, handler));

        switch (event)
        {
            case 'message':
                this.registerDataEvent();
                return super.on('message', handler as EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
            case 'open':
                if (options?.once)
                    this.socket.once('connect', handler);
                else
                    this.socket.on('connect', handler);
                break;
            case 'error':
                if (options?.once)
                    this.socket.once('error', handler);
                else
                    this.socket.on('error', handler);
                break;
            case 'close':
                if (options?.once)
                    this.socket.once('close', handler);
                else
                    this.socket.on('close', handler);
                break;
        }
        return sub.unsubscribe;
    }

    public once<const TEvent extends AllEventKeys<SocketAdapterAkalaEventMap>>(
        event: TEvent,
        handler: EventListener<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>,
        options?: EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>
    ): Subscription
    {
        return this.on(event, handler, { once: true } as EventOptions<AllEvents<SocketAdapterAkalaEventMap>[TEvent]>);
    }
}
