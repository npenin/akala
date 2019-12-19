import { Trigger, Container, Command, metadata, Metadata } from '@akala/commands';
import { HttpRouter, WorkerRouter, Methods, Router } from '../../router';
import { Injector, NextFunction, isPromiseLike } from '@akala/core';
import * as master from '../../master-meta';
import * as worker from '../../worker-meta';
import { Local } from '@akala/commands/dist/processors';

function wrapHttp<T>(container: Container<T>, command: Metadata.Command)
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

async function processCommand<T>(container: Container<T>, c: Metadata.Command, injected: { '$request': master.Request | worker.Request, [key: string]: any })
{
    var req = injected.$request;
    return Local.execute(c.config.http.inject || c.inject || [], function (...args)
    {
        container.dispatch(c.name, ...args)
    }, container, { param: [], route: req.params, query: req.query, body: req.body, headers: req.headers, ...injected });
}

function wrapWorker<T>(container: Container<T>, c: Metadata.Command): worker.RequestHandler
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

export var trigger = new Trigger('http', function register<T>(container: Container<T>, router: HttpRouter | WorkerRouter)
{
    metadata(container).commands.forEach(command =>
    {
        if (!command.config || !command.config.http)
            return;

        var config = command.config.http;

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
});