import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor } from '../processor'
import { Command } from '../metadata';
import { Container } from '../container';

export class JsonRpcWs<T> extends CommandProcessor<T>
{
    public process(command: Command, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number })
    {
        return new Promise<any>((resolve, reject) =>
        {
            this.client.send(command.name, params, function (err: any, result: jsonrpcws.PayloadDataType)
            {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        })
    }

    constructor(private client: jsonrpcws.Client<jsonrpcws.Connection>)
    {
        super('jsonrpcws');
    }
}