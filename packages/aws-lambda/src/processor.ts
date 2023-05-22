import { CommandProcessor, Container, StructuredParameters } from '@akala/commands';
import { Metadata } from '@akala/commands';
import { MiddlewarePromise } from '@akala/core';
import { LambdaClient, InvokeCommand, LambdaClientConfig } from '@aws-sdk/client-lambda';

export class Processor extends CommandProcessor
{
    client: LambdaClient;
    constructor(config: LambdaClientConfig, private prefix?: string)
    {
        super('aws:lambda');
        this.client = new LambdaClient(config);
    }

    public handle(origin: Container<unknown>, cmd: Metadata.Command, params: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        let param = params.param && params.param[0];
        if (cmd.config.aws)
        {
            const indexOfEvent = cmd.config.aws.inject?.indexOf('event');
            if (typeof indexOfEvent !== 'undefined' && indexOfEvent > -1)
                param = params.param && params.param[indexOfEvent];
            else
            {
                const indexOfEventDot = cmd.config.aws.inject?.findIndex(v => v.indexOf('event.') >= 0);
                if (typeof indexOfEventDot !== 'undefined' && indexOfEventDot > -1)
                {
                    param = {};
                    for (let i = indexOfEventDot; i < (cmd.config.aws.inject?.length || 0); i++)
                    {
                        (param as Record<string, unknown>)[cmd.config.aws.inject![i].substring('event.'.length)] = params.param[i];
                    }
                }
            }
        }
        return this.client.send(new InvokeCommand({
            FunctionName: `${this.prefix}${cmd.name.replace(/\./g, '-')}`,
            Payload: new TextEncoder().encode(JSON.stringify(param))
        })).then(r =>
        {
            if (r.FunctionError)
                return Object.assign(new Error(), JSON.parse(new TextDecoder().decode(r.Payload)));
            throw JSON.parse(new TextDecoder().decode(r.Payload));
        }, err => err)
    }
}