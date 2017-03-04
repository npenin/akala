/// <reference types="express" />
/// <reference types="node" />
import * as url from 'url';
import { Readable } from 'stream';
import * as http from 'http';
import * as express from 'express';
export declare type PathParams = string | RegExp | (string | RegExp)[];
export interface IRouterMatcher<T> {
    (path: PathParams, ...handlers: RequestHandler[]): T;
    (path: PathParams, ...handlers: RequestHandlerParams[]): T;
}
export interface ErrorRequestHandler extends express.ErrorRequestHandler {
    (err: any, req: Request, res: Response, next: express.NextFunction): any;
}
export declare type RequestHandlerParams = RequestHandler | ErrorRequestHandler | (RequestHandler | ErrorRequestHandler)[];
export interface RequestHandler extends express.RequestHandler {
    (req: Request, res: Response, next: express.NextFunction): any;
}
export interface IRouterHandler<T> extends express.IRouterHandler<T> {
    (...handlers: RequestHandler[]): T;
    (...handlers: RequestHandlerParams[]): T;
}
export interface akalaRouter {
    (req: Location): void;
    router: IRouterHandler<this> & IRouterMatcher<this>;
}
export interface Router extends express.IRouter<Router>, akalaRouter {
    all: undefined;
    post: undefined;
    put: undefined;
    delete: undefined;
    patch: undefined;
    options: undefined;
    head: undefined;
    get: IRouterMatcher<this>;
    use: IRouterHandler<this> & IRouterMatcher<this>;
}
export declare class Request extends Readable implements http.IncomingMessage {
    constructor(loc: Location);
    url: string;
    uri: url.Url;
    method: string;
    params: {
        [key: string]: any;
    };
    headers: undefined;
    httpVersion: undefined;
    httpVersionMajor: undefined;
    httpVersionMinor: undefined;
    connection: undefined;
    rawHeaders: undefined;
    rawTrailers: undefined;
    trailers: undefined;
    setTimeout: undefined;
    socket: undefined;
    destroy: undefined;
    readable: false;
}
export declare class Response {
}
export declare function router(): Router;
