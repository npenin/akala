import { CommandProcessor, Container, StructuredParameters, Metadata } from '@akala/commands';
import { ErrorWithStatus, MiddlewarePromise } from '@akala/core';
import { LambdaClient, InvokeCommand, LambdaClientConfig } from '@aws-sdk/client-lambda';
import { AwsConfiguration } from './trigger.js';

export class Processor extends CommandProcessor
{
    client: LambdaClient;
    constructor(config: LambdaClientConfig, private readonly prefix?: string)
    {
        super('aws:lambda');
        this.client = new LambdaClient(config);
    }

    public handle(origin: Container<unknown>, cmd: Metadata.Command & { config: Metadata.ExtendedConfigurations<AwsConfiguration, 'aws'> }, params: StructuredParameters<unknown[]>): MiddlewarePromise
    {
        let param = params.param?.[0];
        if (cmd.config.aws)
        {
            const indexOfEvent = cmd.config.aws.inject?.indexOf('event');
            if (indexOfEvent > -1)
                param = params.param?.[indexOfEvent];
            else
            {
                const indexOfEventDot = cmd.config.aws.inject?.findIndex(v => typeof v == 'string' && v.indexOf('event.') >= 0);
                if (indexOfEventDot > -1)
                {
                    param = {};
                    for (let i = indexOfEventDot, j = 0; i < (cmd.config.aws.inject?.length || 0); i++, j++)
                    {
                        if ((cmd.config.aws.inject[i] as string).indexOf('event.') == -1)
                            continue;
                        (param as Record<string, unknown>)[(cmd.config.aws.inject[i] as string).substring('event.'.length)] = params.param[j];
                    }
                }
            }
        }

        const error: Error & { cause?: unknown } = new Error('LambdaInvocationError');

        return this.client.send(new InvokeCommand({
            FunctionName: `${this.prefix}${cmd.name.replace(/\./g, '-')}`,
            Payload: new TextEncoder().encode(JSON.stringify(param))
        })).then(r =>
        {
            if (r.FunctionError)
                return Object.assign(new ErrorWithStatus(500, 'LambdaFailure'), { rejection: JSON.parse(new TextDecoder().decode(r.Payload)) });
            throw JSON.parse(new TextDecoder().decode(r.Payload));
        }, err => { error.cause = err; throw error; })
    }
}
