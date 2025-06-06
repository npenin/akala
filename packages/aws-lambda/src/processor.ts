import { CommandProcessor, Container, StructuredParameters, Metadata } from '@akala/commands';
import { ErrorWithStatus, InjectorMap, MiddlewarePromise } from '@akala/core';
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
        const error: Error & { cause?: unknown } = new Error('LambdaInvocationError');

        return this.client.send(new InvokeCommand({
            FunctionName: `${this.prefix}${cmd.name.replace(/\./g, '-')}`,
            Payload: new TextEncoder().encode(JSON.stringify(new InjectorMap(m =>
            {
                if (m == 'event')
                    return params.param[0];
            }).resolve(cmd.config.aws.inject)
            ))
        })).then(r =>
        {
            if (r.FunctionError)
                return Object.assign(new ErrorWithStatus(500, 'LambdaFailure'), { rejection: JSON.parse(new TextDecoder().decode(r.Payload)) });
            throw JSON.parse(new TextDecoder().decode(r.Payload));
        }, err => { error.cause = err; throw error; })
    }
}
