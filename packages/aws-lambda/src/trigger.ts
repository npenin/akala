import { Metadata, Processors, Trigger } from '@akala/commands'
import { SimpleInjector, logger, mapAsync } from '@akala/core';
import type { APIGatewayEvent, Context } from 'aws-lambda'

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

const log = logger.use('commands:trigger:aws');

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
                log.debug(config);
                log.debug(cmdInjector.resolve(typeof config == 'string' ? config : config[record.eventSource]));
                // container.inspect();
                const cmd = cmdInjector.injectWithName([typeof config == 'string' ? config : config[record.eventSource]],
                    cmdName => container.resolve((cmdName as string).replace(/:/g, '.')))(this);

                if (!cmd)
                    return Promise.reject(new Error('command not found'));

                if (cmd.config[record.eventSource])
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: record.eventSource, context, env: process.env, event: record, params: args }), container, { context, event, params: args, _trigger: record.eventSource })

                if (cmd.config.aws)
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event: record, params: args }), container, { context, event, params: args, _trigger: 'aws' })

                return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));

            }, true, false)
        }
        else
        {
            ctxInjector.register('event', event);
            log.debug(config);
            log.debug(ctxInjector.resolve(typeof config == 'string' ? config : config.aws));
            container.inspect();
            const cmd = ctxInjector.injectWithName([typeof config == 'string' ? config : config.aws],
                (cmdName) => container.resolve((cmdName as string).replace(/:/g, '.')))(this);

            if (!cmd)
                return Promise.reject(new Error('command not found'));

            if (cmd.config.aws)
                return Promise.resolve(Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event, params: args }), container, { context, event, params: args, _trigger: 'aws' }))

            return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));
        }
    }
});
