import * as http from 'http';
import * as https from 'https';
import * as http2 from 'http2';
import * as akala from '@akala/core';
import { Socket } from 'net';
import { MiddlewareComposite, MiddlewarePromise, OptionsResponse, Router, Router2 } from '@akala/core';
import { UpgradeMiddleware } from './upgradeMiddleware';
import { Request, Response } from './shared';
import accepts from 'accepts';
import cobody from 'co-body'

export class HttpRouter extends Router2<Request, Response>
{
    private upgradeRouter = new Router<[Request, Socket, Buffer]>();
    private formatters = new MiddlewareComposite<[Request, Response, unknown]>();

    constructor(options?: akala.RouterOptions)
    {
        super(options);
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

            if (!res.status)
                res.status = function (status: number)
                {
                    res.statusCode = status;
                    return res;
                };

            if (!res.sendStatus)
                res.sendStatus = function (status: number)
                {
                    res.status(status).end();
                    return res;
                };

            if (!res.json)
                res.json = function (content: unknown)
                {
                    if (typeof (content) != 'undefined')
                        content = JSON.stringify(content);
                    res.write(content);
                    res.end();
                    return res;
                };

            if (!res.redirect)
                res.redirect = function (uri, code: number)
                {
                    res.writeHead(code || 302, 'redirect', { location: uri });
                    res.end();
                    return res;
                };
            this.handle(req, res).then((err) => { err && err !== 'break' ? this.formatError(req, res, err) : console.error('deadend'); console.error({ url: req.url, headers: req.headers, ip: req.ip }); res.writeHead(404, 'Not found').end(); },

                (result) => result !== res ? this.format(req, res, result) : undefined);
        });
    }
    static makeRequest(msg: http.IncomingMessage): Request
    {
        const uri = new URL(msg.url);

        return Object.assign(msg, {
            ip: msg.socket.remoteAddress,
            path: uri.pathname,
            query: uri.searchParams,
            body: {
                json(options?) { return cobody.json(msg, options) },
                form(options?) { return cobody.form(msg, options) },
                text(options?) { return cobody.text(msg, options) },
                parse(options?) { return cobody(msg, options) }
            },
            accepts: accepts(msg)
        });
    }

    formatError(req: Request, res: Response, result: Error | OptionsResponse): MiddlewarePromise
    {
        return this.formatters.handleError(result, req, res, null).then(() =>
        {
            console.warn(`no valid formatter for ${req.headers.accept} thus sending as text`);
            const stringify = result.toString()
            res.writeHead(500, 'Internal Server Error', { contenttype: 'text/plain', contentLength: stringify.length });
            res.end(stringify);
        })
    }

    format(req: Request, res: Response, result: unknown): MiddlewarePromise
    {
        return this.formatters.handle(req, res, result).then(() =>
        {
            console.warn(`no valid formatter for ${req.headers.accept} thus sending as text`);
            const stringify = result.toString()
            res.writeHead(200, 'OK', { contenttype: 'text/plain', contentLength: stringify.length });
            res.end(stringify);
        })
    }

    public upgrade(path: string, upgradeSupport: string, handler: ((request: Request, socket: Socket, head: Buffer) => Promise<unknown>)): this
    {
        this.upgradeRouter.useMiddleware(path, new UpgradeMiddleware(upgradeSupport, handler));
        return this;
    }
}
