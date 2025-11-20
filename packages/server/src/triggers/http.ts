import { Trigger, Container, metadata, Metadata } from '@akala/commands';
import { HttpRouter as Router, type Request, type Response } from '../router/index.js';
import { HttpStatusCode, Injector, logger } from '@akala/core';
import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';

const log = logger.use('commands:trigger:http')

function wrapHttp<T>(container: Container<T>, command: Metadata.Command, injector?: Injector)
{
    return function (req: Request, res: Response): Promise<unknown>
    {
        return processCommand(container, command, { $request: req, $response: res, injector }).then(async result =>
        {
            if (res.closed)
                return;
            // if (res.headersSent)
            // {
            const contentType = command.config.http?.type;
            switch (contentType)
            {
                case 'json':
                    return res.json(result);
                case 'text':
                    return await new Promise<void>((resolve, reject) => res.write(result.toString(), err => err ? reject(err) : resolve()));
                case 'xml':
                case 'raw':
            }
            throw result;
            // }
        }, async result =>
        {
            if (res.closed)
                return;
            // if (res.headersSent)
            // {
            const contentType = command.config.http?.type;
            if (typeof result == 'undefined')
                return res.sendStatus(HttpStatusCode.NoContent);

            switch (contentType)
            {
                case 'json':
                    return res.json(result);
                case 'text':
                    return await new Promise<void>((resolve, reject) => res.write(result.toString(), err => err ? reject(err) : resolve()));
                case 'xml':
                case 'raw':
            }

            return result;
            // }
        })
    }
}

export async function processCommand<T>(container: Container<T>, c: Metadata.Command, injected: { '$request': Request, '$response': Response, injector?: Injector, [key: string]: unknown })
{
    const req = injected.$request;
    let bodyParsing: Promise<{ parsed: unknown, raw: Buffer }>;
    return container.handle(container, c, {
        params: [], route: req.params, query: req.query, _trigger: 'http', get rawBody()
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

export const trigger = new Trigger<[void | { router: Router, meta?: Metadata.Container, injector?: Injector } | Router | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server], Router>(
    'http', function register<T>(container: Container<T>, router: { router: Router, meta?: Metadata.Container, injector?: Injector } | Router | http.Server | https.Server | http2.Http2SecureServer | http2.Http2Server)
{
    let commandRouter = new Router({ name: 'commandRouter (' + container.name + ')' });

    if (!router)
        router = commandRouter;

    let meta: Metadata.Container;
    let injector: Injector | undefined;
    if ('router' in router)
    {
        meta = router.meta;
        injector = router.injector
        commandRouter = router = router.router;
    }

    if (router instanceof Router && router !== commandRouter)
        router.useMiddleware(commandRouter);
    else if (!(router instanceof Router))
        commandRouter.attachTo(router);

    if (!meta)
        meta = metadata(container);

    meta.commands.forEach(command =>
    {
        if (!command.config?.http)
            return;

        const config = command.config.http;

        log.debug(config.method || 'use');
        if (config.method === 'use' || !config.method)
        {
            if (commandRouter instanceof Router)
                commandRouter.use(config.route, wrapHttp(container, command, injector));
            else
                throw new Error('Not supported');
        }
        else
            commandRouter[config.method.toLocaleLowerCase()](config.route, wrapHttp(container, command, injector));
    });

    return commandRouter;
});
