import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, CommandNameProcessor } from '../model/processor'
import { Command } from '../metadata';
import { Container, lazy } from '../model/container';
import { IDebugger } from 'debug';
import { Local } from './local';



export class JsonRpc<T> extends CommandProcessor<T>
{
    public static connect(address: string): Promise<JsonRpc<any>>
    {
        return new Promise<jsonrpcws.SocketAdapter>((resolve, reject) =>
        {
            var socket = jsonrpcws.ws.connect(address);
            socket.on('open', function ()
            {
                resolve(socket);
            });
        }).then((socket) =>
        {
            var provier = new JsonRpc(JsonRpc.getConnection(socket))
            provier.passthrough = true;
            return provier;
        });
    }

    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<any>, log?: IDebugger): jsonrpcws.Connection
    {
        var error = new Error();
        var connection = new jsonrpcws.Connection(socket, {
            type: 'client',
            disconnected()
            {
                if (container)
                {
                    var cmd = container.resolve('$disconnect');
                    if (cmd)
                        Local.execute(cmd, cmd.handler, container, { param: [] });
                }
            },
            getHandler(method: string)
            {
                if (!container)
                    return null as any;
                return async function (params, reply)
                {
                    try
                    {
                        if (log)
                            log(params);

                        var cmd = container.resolve(method);
                        if (!cmd)
                        {
                            container.inspect();
                            error.message = `Command with name ${method} could not be found on ${socket.constructor.name}`;
                            throw error;
                        }

                        if (!params)
                            params = { param: [] };
                        Object.defineProperty(params, 'connectionAsContainer', { enumerable: true, get() { return Container.proxy(container?.name + '-client', new JsonRpc(connection, true) as any) } });
                        if (!params._trigger || params._trigger == 'proxy')
                            params._trigger = 'jsonrpc';

                        var result = await Local.execute(cmd, cmd.handler, container, params);
                        reply(null, result);
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

    public process(command: string, params: { param?: jsonrpcws.PayloadDataType<void>, [key: string]: jsonrpcws.PayloadDataType<void> }): Promise<any>
    public process(command: Command, params: { param?: jsonrpcws.PayloadDataType<void>, [key: string]: jsonrpcws.PayloadDataType<void> }): Promise<any>
    public process(command: Command | string, params: { param?: jsonrpcws.PayloadDataType<void>, [key: string]: jsonrpcws.PayloadDataType<void> }): Promise<any>
    {
        return new Promise<any>((resolve, reject) =>
        {
            if (!this.passthrough && typeof command != 'string' && command.inject)
            {
                if (command.inject.length != 1 || command.inject[0] != '$param')
                {
                    // console.log(param);
                    // console.log(command.inject);
                    var param = command.inject.map((v, i) =>
                    {
                        return { name: v, value: params.param[i] }
                    }).filter(p => p.name.startsWith('param.'));
                    params.param = param.map(p => p.value);
                }
            }
            this.client.sendMethod(typeof command == 'string' ? command : command.name, params, function (err: any, result: jsonrpcws.PayloadDataType<any>)
            {
                if (err)
                {
                    reject(err);
                }
                else
                    resolve(result);
            });
        })
    }

    constructor(private client: jsonrpcws.BaseConnection<any>, private passthrough?: boolean)
    {
        super('jsonrpc');
    }
}