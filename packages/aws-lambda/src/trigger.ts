import { Metadata, Processors, Trigger } from '@akala/commands'
import { SimpleInjector, mapAsync } from '@akala/core';
import { APIGatewayEvent, Context } from 'aws-lambda'

export interface AwsConfiguration extends Metadata.Configuration
{
}

declare module '@akala/commands'
{
    export interface ConfigurationMap
    {
        aws: AwsConfiguration;
    }
}

export const trigger = new Trigger('aws', (container, config: { [key: string]: string } | string) =>
{
    return (event: { Records: { eventSource: string }[] } | APIGatewayEvent, context: Context, ...args: []) =>
    {
        const ctxInjector = new SimpleInjector(null);
        ctxInjector.register('context', context);
        ctxInjector.register('env', process.env);
        if (typeof event == 'object' && 'Records' in event)
        {
            return mapAsync(event.Records, async (record) =>
            {
                const cmdInjector = new SimpleInjector(ctxInjector);
                cmdInjector.register('event', record);
                console.log(config);
                console.log(cmdInjector.resolve(typeof config == 'string' ? config : config[record.eventSource]));
                // container.inspect();
                const cmd = cmdInjector.injectWithName([typeof config == 'string' ? config : config[record.eventSource]],
                    cmdName => container.resolve((cmdName as string).replace(/:/g, '.')))(this);

                if (!cmd)
                    return Promise.reject(new Error('command not found'));

                if (cmd.config[record.eventSource])
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: record.eventSource, context, env: process.env, event: record, param: args }), container, { context, event, param: args, _trigger: record.eventSource })

                if (cmd.config.aws)
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event: record, param: args }), container, { context, event, param: args, _trigger: 'aws' })

                return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));

            }, true, false)
        }
        else
        {
            ctxInjector.register('event', event);
            console.log(config);
            console.log(ctxInjector.resolve(typeof config == 'string' ? config : config.aws));
            container.inspect();
            const cmd = ctxInjector.injectWithName([typeof config == 'string' ? config : config.aws],
                (cmdName) => container.resolve((cmdName as string).replace(/:/g, '.')))(this);

            if (!cmd)
                return Promise.reject(new Error('command not found'));

            if (cmd.config.aws)
                return Promise.resolve(Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event, param: args }), container, { context, event, param: args, _trigger: 'aws' }))

            return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));
        }
    }
});
