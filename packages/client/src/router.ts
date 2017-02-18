import * as url from 'url';
import { Readable, Writable } from 'stream';
import * as http from 'http';
import * as express from 'express';
var debug = require('debug')('akala:router');
var exRouter = require('express/lib/router/index.js');

export type PathParams = string | RegExp | (string | RegExp)[];

export interface IRouterMatcher<T>
{
    (path: PathParams, ...handlers: RequestHandler[]): T;
    (path: PathParams, ...handlers: RequestHandlerParams[]): T;
}

export interface ErrorRequestHandler extends express.ErrorRequestHandler
{
    (err: any, req: Request, res: Response, next: express.NextFunction): any;
}

export type RequestHandlerParams = RequestHandler | ErrorRequestHandler | (RequestHandler | ErrorRequestHandler)[];

export interface RequestHandler extends express.RequestHandler
{
    (req: Request, res: Response, next: express.NextFunction): any;
}


export interface IRouterHandler<T> extends express.IRouterHandler<T>
{
    (...handlers: RequestHandler[]): T;
    (...handlers: RequestHandlerParams[]): T;
}


export interface Router extends express.IRouter
{
    (req: Location): void;

    all: undefined;
    post: undefined;
    put: undefined;
    delete: undefined;
    patch: undefined;
    options: undefined;
    head: undefined;
    get: IRouterMatcher<this>
    use: IRouterHandler<this> & IRouterMatcher<this>;
}

export class Request extends Readable implements http.IncomingMessage
{
    constructor(loc: Location)
    {
        super();
        if (loc.hash)
            this.url = loc.hash.substr(1);
        else
            this.url = '/';

        this.uri = url.parse(this.url, true);

    }

    public url: string;
    public uri: url.Url;
    public method = 'get';
    headers: undefined;
    httpVersion: undefined;
    httpVersionMajor: undefined;
    httpVersionMinor: undefined;
    connection: undefined;
    rawHeaders: undefined;
    rawTrailers: undefined;
    trailers: undefined;
    setTimeout: undefined
    socket: undefined;
    destroy: undefined;
    readable: false;
};

export class Response 
{
}

if (!window.setImmediate)
    window['setImmediate'] = function (fn)
    {
        var args = Array.prototype.slice.call(arguments, 1);
        return <number><any>setTimeout(function ()
        {
            fn.apply(this, args)
        }, 0);
    }

export function router(): Router
{

    var proto: express.Router = exRouter();
    var result = function (url: Location)
    {
        var req = new Request(url);
        debug(req.uri);
        var res = new Response();
        proto(<express.Request><any>req, <express.Response><any>res, function (err)
        {
            if (err)
                console.error(err);
        });
    };

    result['__proto__'] = proto;

    return <Router>result;
}