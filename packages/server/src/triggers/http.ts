import { Trigger, Container, metadata, Metadata } from '@akala/commands';
import { HttpRouter as Router, Request, Response } from '../router/index';
import { logger, mapAsync } from '@akala/core';
import { Processors } from '@akala/commands';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';

const log = logger('commands:trigger:http')

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
    let bodyParsing: Promise<{ parsed: unknown, raw: Buffer }>;
    return Processors.Local.handle(c, async function (...args)
    {
        args = await mapAsync(args, async el => await el);
        args = args.filter((a, i) => c.config[''].inject[i].startsWith('param.'))
        log.debug(args);
        return await container.dispatch(c.name, ...args).then(result => { throw result }, err => err);
    }, container, {
        param: [], route: req.params, query: req.query, _trigger: 'http', get rawBody()
        {
            if (!bodyParsing)
                bodyParsing = req.body.parse({ returnRawBody: true });
            return bodyParsing.then(body => body.raw)
        }, get body()
        {
            if (!bodyParsing)
                bodyParsing = req.body.parse({ returnRawBody: true });
            return bodyParsing.then(body => body.parsed)
        }, headers: req.headers, ...injected
    });
}

export const trigger = new Trigger<[{ router: Router, meta: Metadata.Container } | Router | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server], Router>(
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

        log.debug(config.method || 'use');
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