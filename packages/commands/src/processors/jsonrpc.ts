import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor, CommandNameProcessor } from '../processor'
import { Command } from '../metadata';
import { Container } from '../container';
import { IDebugger } from 'debug';

export class JsonRpc<T> extends CommandProcessor<T>
{
    public static getConnection(socket: jsonrpcws.SocketAdapter, container?: Container<any>, log?: IDebugger): jsonrpcws.Connection
    {
        return new jsonrpcws.Connection(socket, {
            type: 'client',
            browser: false,
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
                        var result = await container.dispatch(method, Object.assign(params ?? { param: [] }, { _trigger: 'jsonrpc' }))
                        reply(null, result);
                    }
                    catch (error)
                    {
                        if (log)
                            log(error);
                        reply(error);
                    }
                }
            }
        })
    }

    public process(command: string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    public process(command: Command, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    public process(command: Command | string, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number }): Promise<any>
    {
        return new Promise<any>((resolve, reject) =>
        {
            if (typeof command != 'string' && command.inject)
            {
                var param = command.inject.map((v, i) =>
                {
                    return { name: v, value: params.param[i] }
                }).filter(p => p.name.startsWith('param.'));
                params.param = param.map(p => p.value);
            }
            this.client.sendMethod(typeof command == 'string' ? command : command.name, params, function (err: any, result: jsonrpcws.PayloadDataType)
            {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        })
    }

    constructor(private client: jsonrpcws.Connection)
    {
        super('jsonrpc');
    }
}