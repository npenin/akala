import { CommandProcessor, Container, StructuredParameters } from '@akala/commands';
import { Command } from '@akala/commands/src/metadata/command';
import { MiddlewarePromise } from '@akala/core';
import { LambdaClient, InvokeCommand, LambdaClientConfig } from '@aws-sdk/client-lambda';

export class Processor extends CommandProcessor
{
    client: LambdaClient;
    constructor(config: LambdaClientConfig)
    {
        super('aws:lambda');
        this.client = new LambdaClient(config);
    }

    public handle(origin: Container<unknown>, cmd: Command, param: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        return this.client.send(new InvokeCommand({
            FunctionName: cmd.name,
            Payload: new TextEncoder().encode(JSON.stringify(param.param && param.param[0]))
        })).then(r =>
        {
            if (r.FunctionError)
                return Object.assign(new Error(), JSON.parse(new TextDecoder().decode(r.Payload)));
            throw JSON.parse(new TextDecoder().decode(r.Payload));
        }, err => err)
    }
}