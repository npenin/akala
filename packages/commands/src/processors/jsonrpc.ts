import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, type StructuredParameters } from '../model/processor.js'
import type { Command, Container as MetaContainer } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { Local } from './local.js';
import { Readable } from 'stream';
import { lazy, type LoggerWrapper, type MiddlewarePromise, noop, type SerializableObject, type TypedSerializableObject, logger, ErrorWithStatus, HttpStatusCode, NotHandled, type MiddlewareResult, type SocketAdapter, TcpSocketAdapter } from '@akala/core';
import { type HandlerResult, protocolHandlers as handlers, serverHandlers } from '../protocol-handler.js';
import { Trigger } from '../model/trigger.js'
import { Socket, Server, type ServerOpts } from 'net';
import { TLSSocket, Server as TLSServer, type TlsOptions } from 'tls';
import $metadataCmd from '../commands/$metadata.js';

type OnlyArray<T> = Extract<T, unknown[]>;

handlers.useProtocol('jsonrpc+tcp', async function (url, options)
{
    const socket = new Socket();
    if (url.hostname == '0.0.0.0' || url.hostname == '*')
        await new Promise<void>((resolve, reject) => { socket.on('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); socket.connect({ port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve) });
    else
        await new Promise<void>((resolve, reject) => { socket.on('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); socket.connect({ host: url.hostname, port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve) });

    const connection = JsonRpc.getConnection(new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)), options.container);
    options?.signal?.addEventListener('abort', () => socket.end());

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

serverHandlers.useProtocol('jsonrpc+tcp', async function (url: URL | string, container: Container<unknown>, options: ServerOpts & { signal: AbortSignal })
{
    const server = new Server(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)));
    });

    if (!(url instanceof URL))
        url = new URL(url);

    if (url.hostname == '0.0.0.0' || url.hostname == '*')
        await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen(url.port ? Number(url.port) : 31416, resolve) });
    else
        await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen({ host: url.hostname, port: url.port ? Number(url.port) : 31416 }, resolve) });
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+tcp+tls', async function (url, options)
{
    const socket = new Socket();
    const tlsSocket = new TLSSocket(socket);
    if (url.hostname == '0.0.0.0' || url.hostname == '*')
        await new Promise<void>((resolve, reject) => { tlsSocket.on('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); tlsSocket.connect({ port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve) });
    else
        await new Promise<void>((resolve, reject) => { tlsSocket.on('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); tlsSocket.connect({ host: url.hostname, port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve) });

    const connection = JsonRpc.getConnection(new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)), options.container);
    options?.signal?.addEventListener('abort', () => socket.end());

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

serverHandlers.useProtocol('jsonrpc+tcp+tls', async function (url: URL | string, container: Container<unknown>, options: TlsOptions & { signal: AbortSignal })
{
    const server = new TLSServer(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    if (url.hostname == '0.0.0.0' || url.hostname == '*')
        await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen({ port: isNaN(Number(url.port)) ? 31416 : Number(url.port) }, resolve) });
    else
        await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen({ port: isNaN(Number(url.port)) ? 31416 : Number(url.port), host: url.hostname }, resolve) });

    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+unix', async function (url, options)
{
    const socket = new Socket();
    const error = new ErrorWithStatus(HttpStatusCode.BadGateway);

    await new Promise<void>((resolve, reject) =>
    {
        socket.on('error', err =>
        {
            error.cause = err;
            error.message = err.message;
            reject(error);
        }); socket.connect({ path: url.hostname + url.pathname }, resolve)
    });

    const connection = JsonRpc.getConnection(new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)), options.container);
    options?.signal?.addEventListener('abort', () => socket.end());

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

serverHandlers.useProtocol('jsonrpc+unix', async function (url: URL | string, container: Container<unknown>, options: ServerOpts & { signal: AbortSignal })
{
    const server = new Server(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen(url.hostname + url.pathname, resolve) });
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

handlers.useProtocol('jsonrpc+unix+tls', async function (url, options)
{
    const socket = new Socket();
    const tlsSocket = new TLSSocket(socket);
    await new Promise<void>((resolve, reject) => { tlsSocket.on('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); tlsSocket.connect({ path: url.hostname + url.pathname }, resolve) });

    const connection = JsonRpc.getConnection(new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)), options.container);
    options?.signal?.addEventListener('abort', () => socket.end());

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    };
});

serverHandlers.useProtocol('jsonrpc+unix+tls', async function (url: URL | string, container: Container<unknown>, options: TlsOptions & { signal: AbortSignal })
{
    const server = new TLSServer(options, (socket) =>
    {
        socket.setDefaultEncoding('utf8');
        container.attach(JsonRpc.trigger, new jsonrpcws.JsonNDRpcSocketAdapter(new TcpSocketAdapter(socket)));
    });
    if (!(url instanceof URL))
        url = new URL(url);
    await new Promise<void>((resolve, reject) => { server.once('error', err => reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, err.name, err))); server.listen(url.hostname + url.pathname, resolve) });
    options.signal?.addEventListener('abort', () => server.close((err => { console.error(err) })));
})

async function handler(url: URL, options: { signal: AbortSignal, container?: Container<unknown> }): Promise<HandlerResult<JsonRpc>>
{
    const socket = await new Promise<SocketAdapter<jsonrpcws.Payload<Readable>>>((resolve, reject) =>
    {
        if (url.hostname == '0.0.0.0' || url.hostname == '*')
            url.hostname = '127.0.0.1';
        const socket = jsonrpcws.ws.connect(url.toString());
        socket.on('open', function ()
        {
            resolve(socket);
        });
        socket.on('error', function (err: ErrorEvent)
        {
            if (err instanceof Error)
                reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.message, null, err));
            else
                reject(new ErrorWithStatus(HttpStatusCode.BadGateway, err.error, null, err.error));
        });
    });
    const connection = JsonRpc.getConnection(socket, options.container);
    options.signal?.addEventListener('abort', (ev) => connection.close(ev));

    return {
        processor: new JsonRpc(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { params: true }, (err, metadata) =>
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
        return new Promise<SocketAdapter<jsonrpcws.Payload<Readable>>>((resolve) =>
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

    public static trigger = new Trigger('jsonrpc', async function register<T>(container: Container<T>, media: SocketAdapter<jsonrpcws.Payload<Readable>>)
    {
        // assert.ok(media instanceof ws.SocketAdapter, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
        const error = new Error();
        const log = logger.use('akala:commands:jsonrpc:' + container.name)

        const meta = await container.dispatch('$metadata', true);
        meta.commands.push($metadataCmd);
        const containers: Container<unknown>[] = [];

        const connection = new jsonrpcws.Connection(media, {
            type: 'client',
            disconnected()
            {
                const cmd = meta.commands.find(c => c.name == '$disconnect' || c.config.jsonrpc?.name == '$disconnect')
                if (cmd)
                    Promise.all(containers.map(async c =>
                    {
                        await c.dispatch(cmd);
                    })).then(noop, noop);
            },
            getHandler(method: string)
            {
                if (!container)
                    return null;

                const cmd = meta.commands.find(c => c.name == method || c.config.jsonrpc?.name == method)

                if (!cmd && method !== '$metadata')
                {
                    container.inspect();
                    error.message = `Command with name ${method} could not be found on ${media.constructor.name}`;
                    console.error(error.message);
                    return null;
                }

                return async function (this: jsonrpcws.Connection, params, reply)
                {
                    try
                    {
                        if (log)
                            log.debug(params);

                        if (!params)
                            params = { params: [] as string[] };
                        if (Array.isArray(params))
                            params = { params: params };
                        if (typeof (params) != 'object' || params instanceof Readable || !params['params'])
                            params = { params: [params] } as SerializableObject;

                        Object.defineProperty(params, 'connectionId', { configurable: true, enumerable: false, value: this.id });
                        Object.defineProperty(params, 'connection', { configurable: true, enumerable: false, get: getProcessor });
                        Object.defineProperty(params, 'connectionAsContainer', { configurable: true, enumerable: false, get: getContainer });
                        Object.defineProperty(params, 'socket', { configurable: true, enumerable: false, value: media });

                        if (typeof (params) == 'object' && !params['_trigger'] || params['_trigger'] == 'proxy')
                            params['_trigger'] = 'jsonrpc';

                        const result = await container.dispatch(cmd.name, params as StructuredParameters<SerializableObject[]>);
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
    })

    public static getConnection(socket: SocketAdapter<jsonrpcws.Payload<Readable>>, container?: Container<unknown>, otherInject?: (params: StructuredParameters<TypedSerializableObject<unknown>[]>) => void, log?: LoggerWrapper): jsonrpcws.Connection
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
                    console.error(error.message);
                    return null;
                }

                return async function (this: jsonrpcws.Connection, params, reply)
                {
                    try
                    {
                        if (log)
                            log.debug(params);

                        if (!params)
                            params = { params: [] as string[] };
                        if (Array.isArray(params))
                            params = { params: params };
                        if (typeof (params) != 'object' || params instanceof Readable || !params['params'])
                            params = { params: [params] } as SerializableObject;

                        Object.defineProperty(params, 'connectionId', { configurable: true, enumerable: false, value: this.id });
                        Object.defineProperty(params, 'connection', { configurable: true, enumerable: false, get: getProcessor });
                        Object.defineProperty(params, 'connectionAsContainer', { configurable: true, enumerable: false, get: getContainer });
                        Object.defineProperty(params, 'socket', { configurable: true, enumerable: false, value: socket });
                        if (otherInject)
                            otherInject(params as StructuredParameters<SerializableObject[]>);
                        if (typeof (params) == 'object' && !params['_trigger'] || params['_trigger'] == 'proxy')
                            params['_trigger'] = 'jsonrpc';

                        const result = await container.dispatch(cmd.name, params as StructuredParameters<SerializableObject[]>);
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

    public async handle(container: Container<unknown>, command: Command, params: StructuredParameters<OnlyArray<jsonrpcws.PayloadDataType<void>>>): MiddlewarePromise
    {
        if (typeof command.config.jsonrpc !== 'undefined' && !command.config.jsonrpc)
            return NotHandled;
        return await Local.execute(command, (...args: SerializableObject[]) => 
        {
            // if ((inject.length != 1 || inject[0] != '$param') && !params._trigger)
            // {
            args = Local.extractParams(command.config?.jsonrpc?.inject || command.config?.['']?.inject)(...args);
            // }

            return new Promise<MiddlewareResult>((resolve, reject) =>
            {
                if (this.client.socket.open)
                    try
                    {
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
                    }
                    catch (e)
                    {
                        resolve(e);
                    }
                else
                    resolve(undefined);
            });
        }
            , container, params);
    }

    public get connectionId() { return this.client.id }

    constructor(private readonly client: jsonrpcws.BaseConnection<Readable>)
    {
        super('jsonrpc');
    }
}
