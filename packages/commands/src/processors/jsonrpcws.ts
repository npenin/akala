import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor } from '../processor'
import { Command } from '../metadata';
import { Container } from '../container';

export class JsonRpcWs<T> extends CommandProcessor<T>
{
    public process(command: Command, ...params: any[])
    {
        return new Promise<any>((resolve, reject) =>
        {
            var param: jsonrpcws.SerializableObject[];
            var inject = command.config && command.config['jsonrpcws'] && command.config['jsonrpcws'].inject || command.inject;
            if (inject && inject.length && params && params.length)
            {
                param = [];
                inject.forEach(function (inj, i)
                {
                    var indexOfDot = inj.indexOf('.');
                    if (indexOfDot > 0 && inj.substr(0, indexOfDot) == 'param')
                    {
                        param[Number(inj.substring(indexOfDot + 1))] = params[Number(inj.substring(indexOfDot + 1))];
                    }
                })
            }
            else
                param = params;
            this.client.send(command.name, param, function (err: any, result: jsonrpcws.PayloadDataType)
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