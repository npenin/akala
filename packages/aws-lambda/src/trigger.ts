import { Metadata, Processors, Trigger } from '@akala/commands'
import { Injector, mapAsync } from '@akala/core';
// import { HttpRouter, trigger as httpTrigger } from '@akala/server';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import http from 'http'


export const trigger = new Trigger('aws', (container, config: { [key: string]: string } | string) =>
{
    return (event: { Records: { eventSource: string }[] } | APIGatewayEvent, context: Context, ...args: []) =>
    {
        const ctxInjector = new Injector(null);
        ctxInjector.register('context', context);
        ctxInjector.register('env', process.env);
        if ('Records' in event)
        {
            return mapAsync(event.Records, async (record) =>
            {
                var cmdInjector = new Injector(ctxInjector);
                cmdInjector.register('event', record);
                console.log(config);
                console.log(cmdInjector.resolve(typeof config == 'string' ? config : config[record.eventSource]));
                // container.inspect();
                const cmd: Metadata.Command | void = cmdInjector.injectWithName([typeof config == 'string' ? config : config[record.eventSource]],
                    (cmdName: string) => container.resolve(cmdName.replace(/:/g, '.')))(this);

                if (!cmd)
                    return Promise.reject(new Error('command not found'));

                if (cmd.config[record.eventSource])
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: record.eventSource, context, env: process.env, event: record, param: args }), container, { context, event, param: args, _trigger: record.eventSource })

                if (cmd.config.aws)
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event: record, param: args }), container, { context, event, param: args, _trigger: 'aws' })

                return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));

            }, false)
        }
        else
        {
            ctxInjector.register('event', event);
            console.log(config);
            console.log(ctxInjector.resolve(typeof config == 'string' ? config : config.aws));
            container.inspect();
            const cmd: Metadata.Command | void = ctxInjector.injectWithName([typeof config == 'string' ? config : config.aws],
                (cmdName: string) => container.resolve(cmdName.replace(/:/g, '.')))(this);

            if (!cmd)
                return Promise.reject(new Error('command not found'));

            if (cmd.config.aws)
                return Promise.resolve(Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, env: process.env, event, param: args }), container, { context, event, param: args, _trigger: 'aws' }))

            return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));
        }
    }
});