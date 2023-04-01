import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as akala from '@akala/core';
import { Socket } from 'net';
import { Middleware, MiddlewareComposite, MiddlewarePromise, MiddlewareResult, Router, Router2 } from '@akala/core';
import { UpgradeMiddleware } from './upgradeMiddleware.js';
import { Request, Response } from './shared.js';
import accepts from 'accepts';
import cobody from 'co-body'
import mime from 'mime-types'


export class HttpRouter extends Router2<Request, Response>
{
    private upgradeRouter = new Router<[Request, Socket, Buffer]>();
    public readonly formatters = new MiddlewareComposite<[Request, Response, unknown]>();

    constructor(options?: akala.RouterOptions)
    {
        super(options);
    }

    public registerJsonFormatter()
    {
        this.formatters.useMiddleware({
            handle(req, res, result)
            {
                if (!res.headersSent || mime.extension(res.getHeader('content-type') as string) !== 'json')
                    return Promise.resolve();
                if (!res.headersSent && req.accepts.type('json'))
                    res.setHeader('content-type', mime.contentType('json') as string);
                result = JSON.stringify(result);
                res.write(result);
                res.end();
                return Promise.reject();
            }
        })
    }

    public attachTo(server: http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer): void
    {
        server.on('upgrade', (msg: http.IncomingMessage, socket: Socket, head) =>
        {
            const req = HttpRouter.makeRequest(msg);
            this.upgradeRouter.process(req, socket, head).catch(x => !x && socket.end());
        });
        server.on('request', (msg: http.IncomingMessage, res: Response) =>
        {
            const req = HttpRouter.makeRequest(msg);
            msg.on('error', function (err)
            {
                console.error(err);
            })
            res.on('error', function (err)
            {
                console.error(err);
            })
            // var oldEnd = res.end;
            // res.end = function (...args)
            // {
            //     console.trace(args);
            //     oldEnd.apply(this, args);
            // }

            this.handle(req, HttpRouter.extendResponse(res)).then((err) =>
            {
                if (err && err !== 'break')
                {
                    this.formatError(req, res, err);
                    return;
                }
                console.error('deadend');
                console.error({ url: req.url, headers: req.headers, ip: req.ip });
                res.writeHead(404, 'Not found').end();
                return res;
            },

                (result) => result !== res ? this.format(req, res, result) : undefined);
        });
    }

    public static extendResponse<T extends object>(res: T & Partial<Response>): Response & T
    {
        if (!res.status)
            res.status = function (status: number)
            {
                res.statusCode = status;
                return res as Response;
            };

        if (!res.sendStatus)
            res.sendStatus = function (status: number)
            {
                res.status(status).end();
                return res as Response;
            };

        if (!res.json)
            res.json = function (content: unknown)
            {
                if (!res.headersSent)
                    res.setHeader('content-type', 'application/json');
                if (typeof (content) != 'undefined')
                    content = JSON.stringify(content);
                res.write(content);
                res.end();
                return res as Response;
            };

        if (!res.redirect)
            res.redirect = function (uri, code: number)
            {
                res.writeHead(code || 302, 'redirect', { location: uri });
                res.end();
                return res as Response;
            };

        return res as T & Response;
    }

    static makeRequest(msg: http.IncomingMessage): Request
    {
        const uri = new URL('http://' + msg.headers.host + msg.url);

        return Object.assign(msg, {
            ip: msg.socket.remoteAddress,
            path: uri.pathname,
            query: uri.searchParams,
            params: {},
            body: {
                json(options?) { return cobody.json(msg, options) },
                form(options?) { return cobody.form(msg, options) },
                text(options?) { return cobody.text(msg, options) },
                parse(options?) { return cobody(msg, options) }
            },
            accepts: accepts(msg)
        });
    }

    formatError(req: Request, res: Response, result: MiddlewareResult): MiddlewarePromise
    {
        return this.formatters.handleError(result, req, res, null).then(() =>
        {
            try
            {
                console.warn(`no valid error formatter for ${req.headers.accept} thus sending as text`);
                let stringify = result !== null && result !== undefined ? result && result.toString() : '';
                if (result instanceof Error)
                    stringify = `[${result.name}]: ${result.message}\n${result.stack}`;
                res.writeHead(500, 'Failed', { 'Content-Type': 'text/plain', 'Content-Length': stringify.length }).
                    end(stringify);
            }
            catch (e)
            {
                return e;
            }
        }, result =>
        {
            console.log(result);
        })
    }

    format(req: Request, res: Response, result: unknown): MiddlewarePromise
    {
        return this.formatters.handle(req, res, result).then(() =>
        {
            console.warn(`no valid formatter for ${req.headers.accept} thus sending as text`);
            if (typeof (result) !== 'undefined')
            {
                const stringify = result.toString();
                res.writeHead(200, 'OK', { contenttype: 'text/plain', contentLength: stringify.length });
                res.end(stringify);
            }
            else
                res.writeHead(204, 'OK', { contenttype: 'text/plain', contentLength: 0 }).end();
            //eslint-disable-next-line @typescript-eslint/no-empty-function
        }, () => { });
    }

    public upgrade(path: string, upgradeSupport: string, handler: ((request: Request, socket: Socket, head: Buffer) => Promise<unknown>)): this
    {
        this.upgradeRouter.useMiddleware(path, new UpgradeMiddleware(upgradeSupport, handler));
        return this;
    }
}

export interface HttpRouter
{
    'checkoutMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'connectMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'copyMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'deleteMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'getMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'headMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'lockMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'm-searchMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'mergeMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'mkactivityMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'mkcalendarMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'mkcolMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'moveMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'notifyMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'optionsMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'patchMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'postMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'propMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'findMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'proppatchMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'purgeMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'putMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'reportMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'searchMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'subscribeMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'traceMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'unlockMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;
    'unsubscribeMiddleware'(path: string, ...middlewares: Middleware<[Request, Response]>[]): this;

    'checkout'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'connect'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'copy'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'delete'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'get'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'head'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'lock'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'm-search'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'merge'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'mkactivity'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'mkcalendar'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'mkcol'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'move'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'notify'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'options'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'patch'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'post'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'prop'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'find'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'proppatch'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'purge'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'put'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'report'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'search'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'subscribe'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'trace'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'unlock'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
    'unsubscribe'(path: string, ...handlers: ((...args: [Request, Response]) => Promise<unknown>)[]): this;
}