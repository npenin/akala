import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor } from '../processor'
import { Command } from '../metadata';

export class JsonRpc<T> extends CommandProcessor<T>
{
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