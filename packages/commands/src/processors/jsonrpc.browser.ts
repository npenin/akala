import * as jsonrpcws from '@akala/json-rpc-ws/browser'
import { CommandProcessor, StructuredParameters } from '../model/processor.js'
import { Command, Container as MetaContainer } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { Local } from './local.js';
import { lazy, Logger, MiddlewarePromise, noop, OptionsResponse, SpecialNextParam, SerializableObject, TypedSerializableObject, logger } from '@akala/core';
import { HandlerResult, protocolHandlers as handlers } from '../protocol-handler.js';
import { Trigger } from '../model/trigger.js'

type OnlyArray<T> = Extract<T, unknown[]>;

export async function handler(url: URL, options: { signal: AbortSignal }): Promise<HandlerResult<JsonRpcBrowser>>
{
    const socket = await new Promise<jsonrpcws.SocketAdapter>((resolve) =>
    {
        const socket = jsonrpcws.ws.connect(url.toString());
        socket.on('open', function ()
        {
            resolve(socket);
        });
    });
    const connection = JsonRpcBrowser.getConnection(socket);
    options?.signal?.addEventListener('abort', () => socket.close());

    return {
        processor: new JsonRpcBrowser(connection),
        getMetadata: () => new Promise<MetaContainer>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
            typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
        ))
    }
}

handlers.useProtocol('ws', handler);
handlers.useProtocol('wss', handler);

export class JsonRpcBrowser extends CommandProcessor
{
    public static connect(address: string): Promise<JsonRpcBrowser>
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
            const provier = new JsonRpcBrowser(JsonRpcBrowser.getConnection(socket))
            return provier;
        });
    }

    public static trigger = new Trigger('jsonrpc', function register<T>(container: Container<T>, media: jsonrpcws.SocketAdapter)
    {
        // assert.ok(media instanceof ws.SocketAdapter, 'to be attached, the media must be an instance of @akala/json-rpc-ws.Connection');
        const log = logger('akala:commands:jsonrpc:' + container.name)
        return JsonRpcBrowser.getConnection(media, container, null, log);
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
                        if (typeof (params) != 'object' || !params['param'])
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
                        reply(null, result as jsonrpcws.PayloadDataType<never>);
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
        const getProcessor = lazy(() => new JsonRpcBrowser(connection));
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
        return await Local.execute(command, (...args: SerializableObject[]) => 
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
                    resolve(undefined);
            });
        }
            , container, params);
    }

    public get connectionId() { return this.client.id }

    constructor(private readonly client: jsonrpcws.BaseConnection<ReadableStream<Uint8Array>>)
    {
        super('jsonrpc');
    }
}
