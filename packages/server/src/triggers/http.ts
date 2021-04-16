import { Trigger, Container, metadata, Metadata } from '@akala/commands';
import { HttpRouter as Router, Request, Response } from '../router';
import { log as debug, mapAsync } from '@akala/core';
import { Local } from '@akala/commands/dist/processors';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import parser from 'body-parser'

const log = debug('commands:trigger:http')

function wrapHttp<T>(container: Container<T>, command: Metadata.Command)
{
    return function (req: Request, res: Response): Promise<unknown>
    {
        return processCommand(container, command, { $request: req, $response: res })
    }
}

async function processCommand<T>(container: Container<T>, c: Metadata.Command, injected: { '$request': Request, '$response': Response, [key: string]: unknown })
{
    const req = injected.$request;
    const res = injected.$response;
    let bodyParsing: Promise<unknown>;
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

export const trigger = new Trigger<{ router: Router, meta: Metadata.Container } | Router | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server, Router>(
    'http', function register<T>(container: Container<T>, router: { router: Router, meta: Metadata.Container } | Router | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server)
{
    let commandRouter: Router = new Router();

    let meta: Metadata.Container;
    if (router['router'] && typeof router['meta'] != 'undefined')
    {
        meta = router['meta'];
        commandRouter = router = router['router'];
    }

    if (!(router instanceof Router) && commandRouter instanceof Router)
        commandRouter.attachTo(router as http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer);

    if (!meta)
        meta = metadata(container);

    meta.commands.forEach(command =>
    {
        if (!command.config || !command.config.http)
            return;

        const config = command.config.http;

        log(config.method || 'use');
        if (config.method === 'use' || !config.method)
        {
            if (commandRouter instanceof Router)
                commandRouter.use(config.route, wrapHttp(container, command));
            else
                throw new Error('Not supported');
        }
        else
            if (router instanceof Router)
                commandRouter[config.method](config.route, wrapHttp(container, command));
            else
                throw new Error('Not supported');
    });

    return commandRouter;
});