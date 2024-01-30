import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, StructuredParameters } from '../model/processor.js'
import { Command, Container as MetaContainer } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { Local } from './local.js';
import { Readable } from 'stream';
import { lazy, Logger, MiddlewarePromise, noop, OptionsResponse, SpecialNextParam, SerializableObject, TypedSerializableObject } from '@akala/core';
import { HandlerResult, handlers } from '../protocol-handler.js';

type OnlyArray<T> = Extract<T, unknown[]>;

export async function handler(url: URL, handler: HandlerResult<JsonRpc>): Promise<void>
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

    handler.processor = new JsonRpc(connection, true);
    handler.getMetadata = () => new Promise<Command[]>((resolve, reject) => connection.sendMethod<any, any>('$metadata', { param: true }, (err, metadata) =>
        typeof (err) == 'undefined' ? resolve(metadata) : reject(err)
    ))
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
            const provier = new JsonRpc(JsonRpc.getConnection(socket))
            provier.passthrough = true;
            return provier;
        });
    }

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
        const getProcessor = lazy(() => new JsonRpc(connection, true));
        const getContainer = lazy(() =>
        {
            const c = Container.proxy(container?.name + '-client', getProcessor());
            containers.push(c);
            return c;
        });

        return connection;
    }

    public handle(_container: Container<unknown>, command: Command, params: StructuredParameters<OnlyArray<jsonrpcws.PayloadDataType<void>>>): MiddlewarePromise
    {
        return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
        {
            if (!this.passthrough)
            {
                const inject = command.config?.['']?.inject;
                if ((inject.length != 1 || inject[0] != '$param') && params._trigger)
                {
                    params.param = Local.extractParams(command.config?.jsonrpc?.inject || inject)(...params.param);
                }
            }
            Promise.all(params.param).then((param) =>
            {
                if (this.client.socket.open)
                    this.client.sendMethod(typeof command == 'string' ? command : command.name, Object.assign(params, { param, _trigger: undefined }) as SerializableObject, function (err, result)
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
            }, resolve);
        })
    }

    public get connectionId() { return this.client.id }

    constructor(private client: jsonrpcws.BaseConnection<Readable>, private passthrough?: boolean)
    {
        super('jsonrpc');
    }
}