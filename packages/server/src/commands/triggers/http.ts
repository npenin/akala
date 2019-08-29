import { Trigger, Container, Command, Metadata } from '@akala/commands';
import { HttpRouter, WorkerRouter, Methods, Router } from '../../router';
import { Injector, NextFunction, isPromiseLike } from '@akala/core';
import * as master from '../../master-meta';
import * as worker from '../../worker-meta';

function wrapHttp<T>(container: Container<T>, command: Command<T>)
{
    return function (req: master.Request, res: master.Response, next: NextFunction)
    {
        var result = processCommand(container, command, { '$request': req, $next: next, $response: res })
        if (isPromiseLike(result))
        {
            result.then(function (r)
            {
                res.json(r);
            }, function (err)
                {
                    res.status(500).json(err);
                });
        }
        else if (typeof result != 'undefined')
            res.json(result);
        else
            res.sendStatus(201);
    }
}

async function processCommand<T>(container: Container<T>, c: Command<T>, injected: { '$request': master.Request | worker.Request, [key: string]: any })
{
    var inj = new Injector(container)
    injected.$request.injector = inj;
    var req = injected.$request;
    Object.keys(injected).forEach(k => inj.register(k, injected[k]));

    if (req.params)
        inj.register('param', req.params);

    if (req.query)
        inj.register('query', req.query);

    if (req.body)
        inj.register('body', req.body);

    inj.register('headers', req.headers);

    var config = c.config['http'] as any as HttpConfiguration;
    if (config.inject)
    {
        return inj.injectWithName(config.inject, async function (...args)
        {
            await container.dispatch(c.name, ...args);
        });
    }
    else
        return await container.dispatch(c.name);

}

function wrapWorker<T>(container: Container<T>, c: Command<T>): worker.RequestHandler
{
    return function (req: worker.Request, res: worker.Callback)
    {
        var result = processCommand(container, c, { '$request': req, $callback: res });

        if (isPromiseLike(result))
        {
            result.then(function (r)
            {
                res(200, r);
            }, function (err)
                {
                    res(500, err);
                });
        }
        else if (typeof result != 'undefined')
            res(result);
        else
            res(201);
    }
}

export var trigger = new Trigger('http', function register<T>(container: Container<T>, command: Command<T>, router: HttpRouter | WorkerRouter)
{
    var config = command.config['http'] as any as HttpConfiguration;

    if (config.method === 'use' || !config.method)
    {
        if (router instanceof HttpRouter)
            router.use(config.route, wrapHttp(container, command));
        else
            router.use(config.route, wrapWorker(container, command));
    }
    else
        if (router instanceof HttpRouter)
            router[config.method](config.route, wrapHttp(container, command));
        else
            router[config.method](config.route, wrapWorker(container, command));
})


export interface HttpConfiguration extends Metadata.Configuration
{
    method: 'use' | keyof Methods<any>;
    route: string;
}