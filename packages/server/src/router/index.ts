import * as url from 'url';
import * as http from 'http';
import * as http2 from 'http2';
import * as akala from '@akala/core';
import * as jsonrpc from '@akala/json-rpc-ws'
import * as worker from '../worker-meta'
import { HttpRoute } from './route';
import { HttpLayer } from './layer';
import { Readable } from 'stream';
var debug = akala.log('akala:router');
var routing = require('routington');

export type httpHandler = (req: Request, res: Response) => void;

export type requestHandlerWithNext = (req: Request, res: Response, next: akala.NextFunction) => void;

export type errorHandlerWithNext = (error: any, req: Request, res: Response, next: akala.NextFunction) => void;

export type httpHandlerWithNext = requestHandlerWithNext | errorHandlerWithNext;

export interface Methods<T>
{
    'checkout': T
    'connect': T
    'copy': T
    'delete': T
    'get': T
    'head': T
    'lock': T
    'm-search': T
    'merge': T
    'mkactivity': T
    'mkcalendar': T
    'mkcol': T
    'move': T
    'notify': T
    'options': T
    'patch': T
    'post': T
    'prop': T
    'find': T
    'proppatch': T
    'purge': T
    'put': T
    'report': T
    'search': T
    'subscribe': T
    'trace': T
    'unlock': T
    'unsubscribe': T
}

export interface Request extends http.IncomingMessage
{
    ip: string;
    params: { [key: string]: any };
    query: { [key: string]: any };
    path: string;
    protocol: string;
    injector?: akala.Injector;
}
export interface Response extends http.ServerResponse
{
    status(statusCode: number): Response;
    sendStatus(statusCode: number): Response;
    json(content: any): Response;
    redirect(url: string, redirectCode?: number): Response;
}

export class Router<T extends (akala.Middleware1<any> | akala.Middleware2<any, any>), U extends akala.ErrorMiddleware1<any> | akala.ErrorMiddleware2<any, any>> extends akala.Router<T, U, HttpLayer<T>, HttpRoute<T>> implements Methods<(path: string, ...handlers: (T | U)[]) => Router<T, U>>
{
    constructor(options?: akala.RouterOptions)
    {
        super(options);
    }

    protected buildLayer(path: string, options: akala.LayerOptions, handler: T)
    {
        return new HttpLayer<T>(path, options, handler);
    }

    protected buildRoute(path: string)
    {
        return new HttpRoute<T>(path);
    }

    'all': (path: string, ...handlers: (T | U)[]) => this;
    'checkout': (path: string, ...handlers: (T | U)[]) => this;
    'connect': (path: string, ...handlers: (T | U)[]) => this;
    'copy': (path: string, ...handlers: (T | U)[]) => this;
    'delete': (path: string, ...handlers: (T | U)[]) => this;
    'get': (path: string, ...handlers: (T | U)[]) => this;
    'head': (path: string, ...handlers: (T | U)[]) => this;
    'lock': (path: string, ...handlers: (T | U)[]) => this;
    'm-search': (path: string, ...handlers: (T | U)[]) => this;
    'merge': (path: string, ...handlers: (T | U)[]) => this;
    'mkactivity': (path: string, ...handlers: (T | U)[]) => this;
    'mkcalendar': (path: string, ...handlers: (T | U)[]) => this;
    'mkcol': (path: string, ...handlers: (T | U)[]) => this;
    'move': (path: string, ...handlers: (T | U)[]) => this;
    'notify': (path: string, ...handlers: (T | U)[]) => this;
    'options': (path: string, ...handlers: (T | U)[]) => this;
    'patch': (path: string, ...handlers: (T | U)[]) => this;
    'post': (path: string, ...handlers: (T | U)[]) => this;
    'prop': (path: string, ...handlers: (T | U)[]) => this;
    'find': (path: string, ...handlers: (T | U)[]) => this;
    'proppatch': (path: string, ...handlers: (T | U)[]) => this;
    'purge': (path: string, ...handlers: (T | U)[]) => this;
    'put': (path: string, ...handlers: (T | U)[]) => this;
    'report': (path: string, ...handlers: (T | U)[]) => this;
    'search': (path: string, ...handlers: (T | U)[]) => this;
    'subscribe': (path: string, ...handlers: (T | U)[]) => this;
    'trace': (path: string, ...handlers: (T | U)[]) => this;
    'unlock': (path: string, ...handlers: (T | U)[]) => this;
    'unsubscribe': (path: string, ...handlers: (T | U)[]) => this;
}

export class HttpRouter extends Router<requestHandlerWithNext, errorHandlerWithNext>
{

    constructor(options?: akala.RouterOptions)
    {
        super(options);
    }

    public useGet(path: string, handler: requestHandlerWithNext)
    {
        var layer = this.layer(path, handler);
        layer.method = 'GET';
        return this;
    }

    public attachTo(server: http.Server | http2.Http2SecureServer)
    {
        var self = this;
        server.on('upgrade', (req: Request, socket, head) =>
        {
            req.ip = req.socket.remoteAddress;
            var uri = url.parse(req.url, true);
            req.url = uri.pathname;
            req.query = uri.query;
            req.method = 'upgrade';
            self.handle(req, socket, head, function ()
            {
                console.error('ws deadend');
                console.error(req.url)
            });
        })
        server.on('request', (req: Request, res: Response) =>
        {
            req.ip = req.socket.remoteAddress;
            var uri = url.parse(req.url, true);
            req.url = uri.pathname;
            req.query = uri.query;

            if (!res.status)
                res.status = function (status: number)
                {
                    res.statusCode = status;
                    return res;
                }

            if (!res.sendStatus)
                res.sendStatus = function (status: number)
                {
                    res.status(status).end();
                    return res;
                }

            if (!res.json)
                res.json = function (content: any)
                {
                    if (typeof (content) != 'undefined')
                        switch (typeof (content))
                        {
                            case 'object':
                                content = JSON.stringify(content);
                        }
                    res.write(content);
                    res.end();
                    return res;
                }

            if (!res.redirect)
                res.redirect = function (uri, code: number)
                {
                    res.writeHead(code || 302, 'redirect', { location: uri });
                    res.end();
                    return res;
                }
            self.handle(req, res, function () { console.error('deadend'); console.error({ url: req.url, headers: req.headers, ip: req.ip }); });
        });
    }

    public upgrade(path: string, upgradeSupport: string, ...rest: ((request: Request, socket, head) => void)[])
    {
        var route = this.route(path);
        route.addHandler((layer: HttpLayer<any>) =>
        {
            // console.log('building upgrade layer for ' + path);
            route.methods['upgrade'] = true;
            layer.isApplicable = <TRoute extends akala.Route<any, akala.Layer<any>>>(req, route: TRoute) =>
            {
                var method = req.method.toLowerCase();
                // console.log('upgrade layer received ' + method);
                if (method == 'upgrade')
                {
                    if (req.headers['connection'].toLowerCase() == 'upgrade' && req.headers['upgrade'].toLowerCase() == 'websocket')
                    {
                        // log('layer received upgrade request');
                        return true;
                    }
                }
                return false;
            }
            return layer;
        }, rest);
        return this;
    }

    public handle(req, res, ...rest)
    {
        var methods: string[];

        return this.internalHandle.apply(this, [{
            preHandle: function (done)
            {
                if (req.method === 'OPTIONS')
                {
                    methods = []
                    done = Router.wrap(done, HttpRouter.generateOptionsResponder(res, methods))
                }
                return done;
            },
            notApplicableRoute: function (route: HttpRoute<httpHandlerWithNext>)
            {
                var method = req.method;

                // build up automatic options response
                if (method === 'OPTIONS' && methods)
                {
                    methods.push.apply(methods, route._methods())
                }

                // don't even bother matching route
                if (method !== 'HEAD')
                {
                    return false;
                }
            }
        }, req, res].concat(rest));
    }


    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    private static generateOptionsResponder(res, methods)
    {
        return function onDone(fn, err)
        {
            if (err || methods.length === 0)
            {
                return fn(err)
            }

            HttpRouter.trySendOptionsResponse(res, methods, fn)
        }
    }


    private static trySendOptionsResponse(res, methods, next)
    {
        try
        {
            HttpRouter.sendOptionsResponse(res, methods)
        } catch (err)
        {
            next(err)
        }
    }

    private static sendOptionsResponse(res, methods)
    {
        var options = Object.create(null)

        // build unique method map
        for (var i = 0; i < methods.length; i++)
        {
            options[methods[i]] = true
        }

        // construct the allow list
        var allow = Object.keys(options).sort().join(', ')

        // send response
        res.setHeader('Allow', allow)
        res.setHeader('Content-Length', Buffer.byteLength(allow))
        res.setHeader('Content-Type', 'text/plain')
        res.setHeader('X-Content-Type-Options', 'nosniff')
        res.end(allow)
    }

}

export interface Callback
{
    (status: number): void;
    (data: any): void;
    (status: number, data: any): void;
    (meta: CallbackResponse, data: any): void;
    redirect(url: string);
}

export interface CallbackResponse
{
    headers?: { [header: string]: any };
    statusCode?: number;
    statusMessage?: string;
    data?: jsonrpc.PayloadDataType | string;
}

export type workerRequestHandler = (req: worker.Request, callback: worker.Callback) => void;
export type workerErrorHandler = (error: any, req: worker.Request, callback: worker.Callback) => void;
export type workerHandler = workerRequestHandler | workerErrorHandler;

export class WorkerRouter extends Router<workerRequestHandler, workerErrorHandler>
{
    constructor(options?: akala.RouterOptions)
    {
        var opts = options || {};
        opts.length = opts.length || 1;
        super(options);
    }

    public handle(req: worker.Request, callback: Callback, deadend: workerErrorHandler): void
    {
        var methods: string[];

        return this.internalHandle({
            preHandle: function (done)
            {
                if (req.method === 'OPTIONS')
                {
                    methods = []
                    done = Router.wrap(done, WorkerRouter.generateOptionsResponder(callback, methods))
                }
                return done;
            },
            notApplicableRoute: function (route: HttpRoute<httpHandlerWithNext>)
            {
                var method = req.method;

                // build up automatic options response
                if (method === 'OPTIONS' && methods)
                {
                    methods.push.apply(methods, route._methods())
                }

                // don't even bother matching route
                if (method !== 'HEAD')
                {
                    return false;
                }
            }
        }, req, callback, deadend);
    }


    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    private static generateOptionsResponder(res: Callback, methods: string[])
    {
        return function onDone(fn, err)
        {
            if (err || methods.length === 0)
            {
                return fn(err)
            }

            WorkerRouter.trySendOptionsResponse(res, methods, fn)
        }
    }


    private static trySendOptionsResponse(res: Callback, methods: string[], next: akala.NextFunction)
    {
        try
        {
            WorkerRouter.sendOptionsResponse(res, methods)
        } catch (err)
        {
            next(err)
        }
    }

    private static sendOptionsResponse(res: Callback, methods: string[])
    {
        var options = Object.create(null)

        // build unique method map
        for (var i = 0; i < methods.length; i++)
        {
            options[methods[i]] = true
        }

        // construct the allow list
        var allow = Object.keys(options).sort().join(', ')

        // send response
        res({
            headers: {
                'Allow': allow,
                'Content-Length': Buffer.byteLength(allow),
                'Content-Type': 'text/plain',
                'X-Content-Type-Options': 'nosniff'
            }, data: allow
        });
    }
}

export function router(options?: akala.RouterOptions): HttpRouter
{
    return new HttpRouter(options);
}

export function wrouter(options?: akala.RouterOptions): WorkerRouter
{
    return new WorkerRouter(options);
}

// create Router#VERB functions
http.METHODS.concat('ALL').forEach(function (method)
{
    method = method.toLowerCase();
    Router.prototype[method] = function (this: Router<any, any>, path: string, ...rest)
    {
        var route = this.route(path);
        route.addHandler((layer: HttpLayer<any>) =>
        {
            layer.method = method;
            route.methods[method] = true;
            return layer;
        }, rest);
        return this;
    }
})
