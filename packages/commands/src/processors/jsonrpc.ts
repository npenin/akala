import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, StructuredParameters } from '../model/processor.js'
import { Command, Container as MetaContainer } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { Local } from './local.js';
import { Readable } from 'stream';
import { lazy, Logger, MiddlewarePromise, noop, OptionsResponse, SpecialNextParam, SerializableObject, TypedSerializableObject, logger } from '@akala/core';
import { HandlerResult, handlers, serverHandlers } from '../protocol-handler.js';
import { Trigger } from '../model/trigger.js'
import { NetSocketAdapter } from '../net-socket-adapter.js';
import { Socket, Server, ServerOpts } from 'net';
import { TLSSocket, Server as TLSServer, TlsOptions } from 'tls';

type OnlyArray<T> = Extract<T, unknown[]>;

handlers.useProtocol('jsonrpc+tcp', async function (url, result)
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ host: url.host, port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return Object.assign(result, {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    });
});

serverHandlers.useProtocol('jsonrpc+tcp', async function (url: URL | string, container: Container<unknown>, options: ServerOpts & { signal: AbortSignal })
{
    const server = new Server(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new NetSocketAdapter(socket));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    server.listen(url);
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+tcp+tls', async function (url, result)
{
    const socket = new Socket();
    const tlsSocket = new TLSSocket(socket);
    await new Promise<void>(resolve => tlsSocket.connect({ host: url.host, port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(tlsSocket));

    return Object.assign(result, {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    });
});

serverHandlers.useProtocol('jsonrpc+tcp+tls', async function (url: URL | string, container: Container<unknown>, options: TlsOptions & { signal: AbortSignal })
{
    const server = new TLSServer(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new NetSocketAdapter(socket));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    server.listen(url);
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+unix', async function (url, result)
{
    const socket = new Socket();
    await new Promise<void>(resolve => socket.connect({ path: url.host + url.pathname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(socket));

    return Object.assign(result, {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    });
});

serverHandlers.useProtocol('jsonrpc+unix', async function (url: URL | string, container: Container<unknown>, options: ServerOpts & { signal: AbortSignal })
{
    const server = new Server(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new NetSocketAdapter(socket));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    server.listen(url.host + url.pathname);
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+unix+tls', async function (url, result)
{
    const socket = new Socket();
    const tlsSocket = new TLSSocket(socket);
    await new Promise<void>(resolve => tlsSocket.connect({ path: url.host + url.pathname }, resolve));

    const connection = JsonRpc.getConnection(new NetSocketAdapter(tlsSocket));

    return Object.assign(result, {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    });
});

serverHandlers.useProtocol('jsonrpc+unix+tls', async function (url: URL | string, container: Container<unknown>, options: TlsOptions & { signal: AbortSignal })
{
    const server = new TLSServer(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new NetSocketAdapter(socket));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    server.listen(url.host + url.pathname);
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

async function handler(url: URL): Promise<HandlerResult<JsonRpc>>
{
    const socket = await new Promise<jsonrpcws.SocketAdapter>((resolve) =>
    {
        const socket = jsonrpcws.ws.connect(url.toString());
        socket.on('open', function ()
        {
            resolve(socket);
        });
    });
    const connection = JsonRpc.getConnection(socket);

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    }
}

handlers.useProtocol('ws', handler);
handlers.useProtocol('wss', handler);

export class JsonRpc extends CommandProcessor
{
    public static connect(address: string): Promise<JsonRpc>
    {
        return new Promise<jsonrpcws.SocketAdapter>((resolve) =>
        {
            const socket = jsonrpcws.ws.connect(address);
            socket.on('open', function ()
            {
                resolve(socket);
            });
        }).then((socket) =>
        {
            const provider = new JsonRpc(JsonRpc.getConnection(socket))
            return provider;
        });
    }

    public static trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: jsonrpcws.SocketAdapter)
    {
        // assert.ok(media instanceof ws.SocketAdapter, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
        const log = logger('akala:commands:jsonrpc:' + container.name)
        return JsonRpc.getConnection(media, container, null, log);
    })

    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<unknown>, otherInject?: (params: StructuredParameters<TypedSerializableObject<unknown>[]>) => void, log?: Logger): jsonrpcws.Connection
    {
        const error = new Error();
        var containers: Container<unknown>[] = [];
        if (container)
            containers.push(container);

        const connection = new jsonrpcws.Connection(socket, {
            type: 'client',
            disconnected()
            {
                Promise.all(containers.map(async c =>
                {
                    const cmd = c.resolve('$disconnect');
                    if (cmd)
                        await c.dispatch(cmd);
                })).then(noop, noop);
            },
            getHandler(method: string)
            {
                if (!container)
                    return null;
                const cmd = container.resolve(method);
                if (!cmd)
                {
                    container.inspect();
                    error.message = `Command with name ${method} could not be found on ${socket.constructor.name}`;
                    return null;
                }

                return async function (this: jsonrpcws.Connection, params, reply)
                {
                    try
                    {
                        if (log)
                            log.debug(params);


                        if (!params)
                            params = { param: [] as string[] };
                        if (Array.isArray(params))
                            params = { param: params };
                        if (typeof (params) != 'object' || params instanceof Readable || !params['param'])
                            params = { param: [params] } as SerializableObject;

                        Object.defineProperty(params, 'connectionId', { configurable: true, enumerable: false, value: this.id });
                        Object.defineProperty(params, 'connection', { configurable: true, enumerable: false, get: getProcessor });
                        Object.defineProperty(params, 'connectionAsContainer', { configurable: true, enumerable: false, get: getContainer });
                        Object.defineProperty(params, 'socket', { configurable: true, enumerable: false, value: socket });
                        if (otherInject)
                            otherInject(params as StructuredParameters<SerializableObject[]>);
                        if (typeof (params) == 'object' && !params['_trigger'] || params['_trigger'] == 'proxy')
                            params['_trigger'] = 'jsonrpc';

                        const result = await container.dispatch(method, params as StructuredParameters<SerializableObject[]>);
                        reply(null, result as jsonrpcws.PayloadDataType<Readable>);
                    }
                    catch (error)
                    {
                        if (typeof error === 'undefined')
                            return;
                        if (log)
                            log.error(error);
                        if (error && typeof error.toJSON == 'function')
                            reply(error.toJSON());
                        else
                            reply(error);
                    }
                }
            }
        });
        const getProcessor = lazy(() => new JsonRpc(connection));
        const getContainer = lazy(() =>
        {
            const c = Container.proxy(container?.name + '-client', getProcessor());
            containers.push(c);
            return c;
        });

        return connection;
    }

    public handle(container: Container<unknown>, command: Command, params: StructuredParameters<OnlyArray<jsonrpcws.PayloadDataType<void>>>): MiddlewarePromise
    {
        return Local.execute(command, (...args: SerializableObject[]) => 
        {
            // if ((inject.length != 1 || inject[0] != '$param') && !params._trigger)
            // {
            args = Local.extractParams(command.config?.jsonrpc?.inject || command.config?.['']?.inject)(...args);
            // }

            return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
            {
                if (this.client.socket.open)
                    this.client.sendMethod(typeof command == 'string' ? command : command.name, args, function (err, result)
                    {
                        if (err)
                        {
                            if (!(err instanceof Error))
                                resolve(Object.assign(new Error(err.message), err));
                            else
                                resolve(err);
                        }
                        else
                            reject(result);
                    })
                else
                    resolve();
            });
        }
            , container, params);
    }

    public get connectionId() { return this.client.id }

    constructor(private client: jsonrpcws.BaseConnection<Readable>)
    {
        super('jsonrpc');
    }
}