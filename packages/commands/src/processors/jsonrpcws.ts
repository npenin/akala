import * as jsonrpcws from '@akala/json-rpc-ws'
import { Processor } from '../processor'
import { Command } from '../metadata';

export class JsonRpcWs extends Processor
{
    public process(command: Command, ...params: any[])
    {
        return new Promise<any>((resolve, reject) =>
        {
            var param: jsonrpcws.SerializableObject[];
            var inject = command.triggers && command.triggers['jsonrpcws'] && command.triggers['jsonrpcws'].inject || command.inject;
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