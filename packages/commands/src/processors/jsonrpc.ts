import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, CommandNameProcessor, StructuredParameters } from '../model/processor.js'
import { Command } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { IDebugger } from 'debug';
import { Local } from './local.js';
import { Readable } from 'stream';
import { MiddlewarePromise, OptionsResponse, SpecialNextParam } from '@akala/core';

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

    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<unknown>, log?: IDebugger): jsonrpcws.Connection
    {
        const error = new Error();
        const connection = new jsonrpcws.Connection(socket, {
            type: 'client',
            disconnected()
            {
                if (container)
                {
                    const cmd = container.resolve('$disconnect');
                    if (cmd)
                        Local.execute(cmd, cmd.handler, container, { param: [] });
                }
            },
            getHandler(method: string)
            {
                if (!container)
                    return null;
                return async function (params, reply)
                {
                    try
                    {
                        if (log)
                            log(params);

                        const cmd = container.resolve(method);
                        if (!cmd)
                        {
                            container.inspect();
                            error.message = `Command with name ${method} could not be found on ${socket.constructor.name}`;
                            throw error;
                        }

                        if (!params)
                            params = { param: [] };
                        if (Array.isArray(params))
                            params = { param: params };
                        if (typeof (params) != 'object' || params instanceof Readable || !params['param'])
                            params = { param: [params] } as unknown as jsonrpcws.SerializableObject;

                        Object.defineProperty(params, 'connectionAsContainer', { enumerable: true, get() { return Container.proxy(container?.name + '-client', new JsonRpc(connection, true) as unknown as CommandNameProcessor) } });
                        if (typeof (params) == 'object' && !params['_trigger'] || params['_trigger'] == 'proxy')
                            params['_trigger'] = 'jsonrpc';

                        const result = await Local.execute(cmd, cmd.handler, container, params as StructuredParameters<jsonrpcws.SerializableObject[]>);
                        reply(null, result as jsonrpcws.PayloadDataType<Readable>);
                    }
                    catch (error)
                    {
                        if (log)
                            log(error);
                        if (error && typeof error.toJSON == 'function')
                            reply(error.toJSON());
                        else
                            reply({ message: error.message, stack: error.stack, code: error.code });
                    }
                }
            }
        });

        return connection;
    }

    public handle(command: Command | string, params: StructuredParameters<OnlyArray<jsonrpcws.PayloadDataType<void>>>): MiddlewarePromise
    {
        return new Promise<Error | SpecialNextParam | OptionsResponse>((resolve, reject) =>
        {
            if (!this.passthrough && typeof command != 'string' && command.inject)
            {
                if (command.inject.length != 1 || command.inject[0] != '$param')
                {
                    // console.log(param);
                    // console.log(command.inject);
                    const param = command.inject.map((v, i) =>
                    {
                        return { name: v, value: params.param[i] }
                    }).filter(p => p.name.startsWith('param.'));
                    params.param = param.map(p => p.value) as jsonrpcws.SerializableObject[];
                }
            }
            this.client.sendMethod(typeof command == 'string' ? command : command.name, params as unknown as jsonrpcws.PayloadDataType<Readable>, function (err, result)
            {
                if (err)
                {
                    resolve(err as unknown as Error);
                }
                else
                    reject(result);
            });
        })
    }

    constructor(private client: jsonrpcws.BaseConnection<Readable>, private passthrough?: boolean)
    {
        super('jsonrpc');
    }
}