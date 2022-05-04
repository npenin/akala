import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, StructuredParameters } from '../model/processor'
import { Command } from '../metadata/index';
import { Container } from '../model/container';
import { Local } from './local';
import { Readable } from 'stream';
import { lazy, Logger, MiddlewarePromise, OptionsResponse, SpecialNextParam } from '@akala/core';
import { Connection } from '@akala/json-rpc-ws';

type OnlyArray<T> = Extract<T, unknown[]>;


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

    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<unknown>, log?: Logger): jsonrpcws.Connection
    {
        const error = new Error();
        var containers: Container<unknown>[] = [];
        if (container)
            containers.push(container);
        const connection = new jsonrpcws.Connection(socket, {
            type: 'client',
            disconnected()
            {
                containers.forEach(c =>
                {
                    const cmd = c.resolve('$disconnect');
                    if (cmd)
                        c.dispatch(cmd);
                })
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
                    throw error;
                }

                return async function (this: Connection, params, reply)
                {
                    try
                    {
                        if (log)
                            log.debug(params);


                        if (!params)
                            params = { param: [] };
                        if (Array.isArray(params))
                            params = { param: params };
                        if (typeof (params) != 'object' || params instanceof Readable || !params['param'])
                            params = { param: [params] } as unknown as jsonrpcws.SerializableObject;

                        const getProcessor = lazy(() => new JsonRpc(this, true));
                        const getContainer = lazy(() =>
                        {
                            const c = Container.proxy(container?.name + '-client', getProcessor(), 2);
                            containers.push(c);
                            return c;
                        });
                        Object.defineProperty(params, 'connection', { enumerable: true, get: getProcessor });
                        Object.defineProperty(params, 'connectionAsContainer', { enumerable: true, get: getContainer });
                        if (typeof (params) == 'object' && !params['_trigger'] || params['_trigger'] == 'proxy')
                            params['_trigger'] = 'jsonrpc';

                        const result = await container.dispatch(method, params as StructuredParameters<jsonrpcws.SerializableObject[]>);
                        reply(null, result as jsonrpcws.PayloadDataType<Readable>);
                    }
                    catch (error)
                    {
                        if (log)
                            log.error(error);
                        if (error && typeof error.toJSON == 'function')
                            reply(error.toJSON());
                        else
                            reply(error && Object.fromEntries(Object.entries(error)) as unknown as jsonrpcws.ErrorPayload['error']);
                    }
                }
            }
        });

        return connection;
    }

    public handle(_container: Container<any>, command: Command | string, params: StructuredParameters<OnlyArray<jsonrpcws.PayloadDataType<void>>>): MiddlewarePromise
    {

        return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
        {
            if (!this.passthrough && typeof command != 'string')
            {
                const inject = command.config?.['']?.inject || command.inject;
                if ((inject.length != 1 || inject[0] != '$param') && params._trigger)
                {
                    params.param = Local.extractParams(command.config?.jsonrpc?.inject || inject)(...params.param);
                }
            }
            Promise.all(params.param).then((param) =>
                this.client.socket.open &&
                this.client.sendMethod(typeof command == 'string' ? command : command.name, Object.assign(params, { param }) as jsonrpcws.SerializableObject, function (err, result)
                {
                    if (err)
                    {
                        resolve(err as unknown as Error);
                    }
                    else
                        reject(result);
                }), resolve);
        })
    }

    constructor(private client: jsonrpcws.BaseConnection<Readable>, private passthrough?: boolean)
    {
        super('jsonrpc');
    }
}