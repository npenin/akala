import * as jsonrpcws from '@akala/json-rpc-ws'
import { CommandProcessor } from '../processor'
import { Command } from '../metadata';
import { Writable } from 'stream';
import { resolve } from '@akala/core';

export class Stream<T> extends CommandProcessor<T>
{
    public process(command: Command, params: { param: jsonrpcws.SerializableObject[], [key: string]: jsonrpcws.SerializableObject | jsonrpcws.SerializableObject[] | string | number })
    {
        return new Promise<void>((resolve, reject) =>
        {
            this.stream.write({ command: command.name, param: params }, function (error)
            {
                if (error)
                    reject(error);
                else
                    resolve();
            });
        });
    }

    constructor(private stream: Writable)
    {
        super('stream');
    }
}