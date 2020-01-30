import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor } from '../processor'
import { Command } from '../metadata';
import { Container } from '../container';
import { IDebugger } from 'debug';

export class JsonRpc<T> extends CommandProcessor<T>
{
    public static getConnection(socket: jsonrpcws.SocketAdapter, container: Container<any>, log?: IDebugger): jsonrpcws.Connection
    {
        return new jsonrpcws.Connection(socket, {
            type: 'client',
            browser: false,
            disconnected()
            {

            },
            getHandler(method: string)
            {
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

    public process(command: Command, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number })
    {
        return new Promise<any>((resolve, reject) =>
        {
            var inject = command?.config[this.name]?.inject || command.inject;
            if (inject)
            {
                var injectParams = inject;
                params.param = params.param.filter((v, i) => injectParams[i].substring(0, 'param'.length) == 'param');
            }
            this.client.sendMethod(command.name, params, function (err: any, result: jsonrpcws.PayloadDataType)
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