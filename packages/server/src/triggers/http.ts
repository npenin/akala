import { Trigger, Container, metadata, Metadata } from '@akala/commands';
import { HttpRouter, WorkerRouter } from '../router';
import { NextFunction, isPromiseLike, log as debug, mapAsync } from '@akala/core';
import * as master from '../master-meta';
import * as worker from '../worker-meta';
import { Local } from '@akala/commands/dist/processors';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import parser from 'body-parser'

const log = debug('commands:trigger:http')

function wrapHttp<T>(container: Container<T>, command: Metadata.Command)
{
    return function (req: master.Request, res: master.Response, next: NextFunction)
    {
        var result = processCommand(container, command, { '$request': req, $next: next, $response: res })
        if (isPromiseLike(result))
        {
            result.then(function (r)
            {
                if (typeof r == 'undefined')
                    res.sendStatus(201);
                else
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

async function processCommand<T>(container: Container<T>, c: Metadata.Command, injected: { '$request': master.Request | worker.Request, '$response': master.Response, [key: string]: any })
{
    var req = injected.$request;
    var res = injected.$response;
    var bodyParsing: Promise<any>;
    return Local.execute(c, async function (...args)
    {
        args = await mapAsync(args, async el => await el);
        args = args.filter((a, i) => c.inject[i].startsWith('param.'))
        log(args);
        return await container.dispatch(c.name, ...args);
    }, container, {
        param: [], route: req.params, query: req.query, _trigger: 'http', get body()
        {
            if (bodyParsing)
                return bodyParsing;
            return bodyParsing = new Promise((resolve, reject) =>
            {
                if (req['body'])
                {
                    log('already parsed');
                    log(req['body']);
                    resolve(req['body']);
                }
                else
                    parser.json()(req, res, function (err)
                    {
                        if (err)
                            reject(err);
                        else if (req['body'])
                        {
                            log('json');
                            log(req['body']);
                            resolve(req['body']);
                        }
                        else parser.urlencoded()(req, res, function (err)
                        {
                            if (err)
                                reject(err);
                            else if (req['body'])
                            {
                                log('urlencoded');
                                log(req['body']);
                                resolve(req['body']);
                            }
                            else
                                parser.text()(req, res, function (err)
                                {
                                    if (err)
                                        reject(err);
                                    else if (req['body'])
                                    {
                                        log('text');
                                        log(req['body']);
                                        resolve(req['body']);
                                    }
                                    else
                                        reject(new Error('body format not understood'));
                                })
                        })
                    });
            })
        }, headers: req.headers, ...injected
    });
}

export var trigger = new Trigger('http', function register<T>(container: Container<T>, router: { router: HttpRouter, meta: Metadata.Container } | HttpRouter | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server)
{
    var commandRouter: HttpRouter | WorkerRouter = new HttpRouter();

    var meta: Metadata.Container;
    if (router['router'] && typeof router['meta'] != 'undefined')
    {
        meta = router['meta'];
        commandRouter = router = router['router'];
    }

    if (!(router instanceof HttpRouter) && commandRouter instanceof HttpRouter)
        commandRouter.attachTo(router as any);

    if (!meta)
        meta = metadata(container);

    meta.commands.forEach(command =>
    {
        if (!command.config || !command.config.http)
            return;

        var config = command.config.http;

        log(config.method || 'use');
        if (config.method === 'use' || !config.method)
        {
            if (commandRouter instanceof HttpRouter)
                commandRouter.use(config.route, wrapHttp(container, command));
            else
                throw new Error('Not supported');
        }
        else
            if (router instanceof HttpRouter)
                commandRouter[config.method](config.route, wrapHttp(container, command));
            else
                throw new Error('Not supported');
    });

    return commandRouter;
});