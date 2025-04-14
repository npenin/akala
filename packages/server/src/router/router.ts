import http from 'http';
import https from 'https';
import http2 from 'http2';
import { Socket } from 'net';
import { ErrorWithStatus, MiddlewareAsync, MiddlewareCompositeWithPriorityAsync, MiddlewarePromise, MiddlewareResult, NotHandled, Router2Async, RouterAsync, RouterOptions } from '@akala/core';
import { UpgradeMiddleware } from './upgradeMiddleware.js';
import { Request, Response } from './shared.js';
import accepts from 'accepts';
import cobody from 'co-body'
import mime from 'mime-types'


export class HttpRouter extends Router2Async<Request, Response>
{
    private readonly upgradeRouter = new RouterAsync<[Request, Socket, Buffer]>();
    public readonly formatters = new MiddlewareCompositeWithPriorityAsync<[Request, Response, unknown]>();

    constructor(options?: RouterOptions)
    {
        super(options);
    }

    public registerJsonFormatter(priority: number = 100): void
    {
        this.formatters.useMiddleware(priority, {
            handle(req, res, result)
            {
                if (!res.headersSent || mime.extension(res.getHeader('content-type') as string) !== 'json')
                    return NotHandled;
                if (!res.headersSent && req.accepts.type('json'))
                    res.setHeader('content-type', mime.contentType('json') as string);
                result = JSON.stringify(result);
                res.write(result);
                res.end();
                return Promise.reject();
            }
        })
    }
    public registerErrorFormatter(priority: number = 100): void
    {
        this.formatters.useError(priority, async (err, _req, res) =>
        {
            if (err instanceof ErrorWithStatus)
                return res.status(err.statusCode).json(err)
            else if (err instanceof Error)
                return res.status(500).json({ error: err.message, stack: err.stack })
            else
                return res.status(500).json({ error: err })
        }
        );

    }

    public attachTo(server: http.Server | https.Server | http2.Http2Server | http2.Http2SecureServer): void
    {
        server.on('upgrade', (msg: http.IncomingMessage, socket: Socket, head) =>
        {
            const req = HttpRouter.extendRequest(msg);
            this.upgradeRouter.process(req, socket, head).catch(x => !x && socket.end());
        });
        server.on('request', (msg: http.IncomingMessage, res: Response) =>
        {
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

            const req = HttpRouter.extendRequest(msg);
            return this.handle(req, HttpRouter.extendResponse(res)).then(err =>
            {
                if (!err && !res.headersSent)
                {
                    console.error('deadend');
                    console.error({ url: req.url, headers: req.headers, ip: req.ip });
                    res.writeHead(404, 'Not found').end();
                    return res;
                }
            });
        });
    }

    public handle(req: Request, res: Response)
    {
        return super.handle(req, res).then((err) =>
        {
            if (err && err !== 'break')
            {
                this.formatError(req, res, err);
                return NotHandled;
            }
            return NotHandled;
        },
            (result) => result !== res ? this.format(req, res, result) : undefined);
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

        if (!res.setCookie)
            res.setCookie = function (name: string, value: string, options?: { [key: string]: string })
            {
                if (typeof value === 'object')
                    value = JSON.stringify(value);
                let optionsString: string;
                if (typeof options === 'object')
                    optionsString = Object.entries(options).map(([key, value]) => typeof value == 'boolean' ? value ? key : '' : `${key}=${value}`).join('; ');
                else
                    optionsString = '';

                const cookies = res.getHeader('set-cookie');
                if (Array.isArray(cookies))
                {
                    res.removeHeader('set-cookie');
                    cookies.forEach(cookie =>
                    {
                        if (cookie.startsWith(`${name}=`))
                            res.appendHeader('set-cookie', `${name}=${value}; ${optionsString}`);
                        else
                            res.appendHeader('set-cookie', cookie);
                    });
                }
                else
                    res.appendHeader('set-cookie', `${name}=${value}; ${optionsString}`);
                return res as Response;
            };

        if (!res.clearCookie)
            res.clearCookie = function (name: string)
            {
                const cookies = res.getHeader('set-cookie');
                if (Array.isArray(cookies))
                {
                    res.removeHeader('set-cookie');
                    cookies.forEach(cookie =>
                    {
                        if (cookie.startsWith(`${name}=`))
                        {
                            res.appendHeader('set-cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
                        }
                        else
                            res.appendHeader('set-cookie', cookie);
                    });
                }
                else
                    res.setHeader('set-cookie', `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT`);
                return res as Response;
            };


        if (!res.json)
            res.json = function (content: unknown)
            {
                if (!res.headersSent)
                    res.setHeader('content-type', 'application/json');
                if (typeof (content) != 'undefined')
                {
                    if (content instanceof Error)
                        content = { error: content.message, stack: content.stack, cause: content.cause, name: content.name, ...content };
                    content = JSON.stringify(content);
                }
                res.write(content);
                res.end();
                return res as Response;
            };

        if (!res.redirect)
            res.redirect = function (uri, code: number)
            {
                res.writeHead(code || 302, 'redirect', { location: uri, ...res.getHeaders() });
                res.end();
                return res as Response;
            };

        return res as T & Response;
    }

    public static extendRequest(msg: http.IncomingMessage): Request
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

    formatError(req: Request, res: Response, result: MiddlewareResult<never>): MiddlewarePromise
    {
        return this.formatters.handleError(result, req, res, null).then(() =>
        {
            try
            {
                console.warn(`no valid error formatter for ${req.headers.accept} thus sending as text for path ${req.url}`);
                let stringified = result !== null && result !== undefined ? result && result.toString() : '';
                if (result instanceof Error)
                    stringified = `[${result.name}]: ${result.message}\n${result.stack}`;
                res.writeHead(500, 'Failed', { 'Content-Type': 'text/plain', 'Content-Length': stringified.length }).
                    end(stringified);
            }
            catch (e)
            {
                return e;
            }
        }, result =>
        {
            if (result !== res)
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

            return NotHandled;
        }, () => { return NotHandled });
    }

    public upgrade(path: string, upgradeSupport: string, handler: ((request: Request, socket: Socket, head: Buffer) => Promise<unknown>)): this
    {
        this.upgradeRouter.useMiddleware(path, new UpgradeMiddleware(upgradeSupport, handler));
        return this;
    }
}

export interface HttpRouter
{
    'checkoutMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'connectMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'copyMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'deleteMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'getMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'headMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'lockMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'm-searchMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'mergeMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'mkactivityMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'mkcalendarMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'mkcolMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'moveMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'notifyMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'optionsMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'patchMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'postMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'propMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'findMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'proppatchMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'purgeMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'putMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'reportMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'searchMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'subscribeMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'traceMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'unlockMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;
    'unsubscribeMiddleware'(path: string, ...middlewares: MiddlewareAsync<[Request, Response]>[]): this;

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
