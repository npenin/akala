import { Metadata, Processors, Trigger } from '@akala/commands'
import { Injector, mapAsync } from '@akala/core';
import { HttpRouter, trigger as httpTrigger } from '@akala/server';
import { APIGatewayEvent, APIGatewayProxyResult, Context } from 'aws-lambda'
import http from 'http'


export const trigger = new Trigger('aws', (container, config: { [key: string]: string } | string) =>
{
    return (event: { Records: { eventSource: string }[] } | APIGatewayEvent, context: Context) =>
    {
        const ctxInjector = new Injector(null);
        ctxInjector.register('context', context);
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
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: record.eventSource, context, event: record, param: args }), container, { context, event, param: [], _trigger: record.eventSource })

                if (cmd.config.aws)
                    return Processors.Local.execute(cmd, (...args) => container.dispatch(cmd, { _trigger: 'aws', context, event, param: args }), container, { context, event, param: [], _trigger: 'aws' })

                return Promise.reject(new Error('AWS command mapping not found for command ' + cmd.name));

            }, false)
        }
        else if ('path' in event)
        {
            ctxInjector.register('event', event);
            const router = container.attach(httpTrigger, { router: new HttpRouter(), injector: ctxInjector });
            router.formatters.useMiddleware({
                handle(_req, res, result)
                {
                    return Promise.reject({ statusCode: res.statusCode || 200, body: JSON.stringify(result) })
                },
                handleError(err, req, res, result)
                {
                    return Promise.reject({ statusCode: 500, body: err && err.toString() || 'An unexpected error occurred' });
                }
            });
            const req = HttpRouter.makeRequest(event as unknown as http.IncomingMessage);
            const res = HttpRouter.extendResponse<Partial<APIGatewayProxyResult>>({});
            return router.handle(req, res).then((err) =>
            {
                if (err && err !== 'break')
                {
                    router.formatError(req, res, err);
                    return;
                }
                console.error('deadend');
                console.error({ url: req.url, headers: req.headers, ip: req.ip });
                res.statusCode = 404;
                res.statusMessage = 'Not Found';
                res.body = 'Not Found';
                return res;
            },
                (result) => result !== res ? router.format(req, res, result).then(e => router.formatError(req, res, e), x => x) : res);
        }
        throw new Error('Not supported')
    }
});