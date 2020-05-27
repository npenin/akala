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
        }).then((socket) => new JsonRpc(JsonRpc.getConnection(socket)));
    }

    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<any>, log?: IDebugger): jsonrpcws.Connection
    {
        var error = new Error();
        var connection = new jsonrpcws.Connection(socket, {
            type: 'client',
            disconnected()
            {

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
                            error.message = `Command with name ${method} could not be found on ${socket.constructor.name}`;
                            throw error;
                        }

                        if (!params)
                            params = { param: [] };
                        params.containerAsConnection = lazy(() => new Container(container?.name + '-client', null, new JsonRpc(connection)));
                        if (!params._trigger || params._trigger == 'proxy')
                            params._trigger = 'jsonrpc';

                        var result = await Local.execute(cmd, cmd.handler, container, params);
                        reply(null, result);
                    }
                    catch (error)
                    {
                        if (log)
                            log(error);
                        if (typeof error.toJSON == 'function')
                            reply(error.toJSON());
                        else
                            reply(error);
                    }
                }
            }
        });

        return connection;
    }

    public process(command: string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    public process(command: Command, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    public process(command: Command | string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    {
        return new Promise<any>((resolve, reject) =>
        {
            if (!this.passthrough && typeof command != 'string' && command.inject)
            {
                var param = command.inject.map((v, i) =>
                {
                    return { name: v, value: params.param[i] }
                }).filter(p => p.name.startsWith('param.'));
                params.param = param.map(p => p.value);
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