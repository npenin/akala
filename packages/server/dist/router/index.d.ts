/// <reference types="node" />
import * as http from 'http';
import { Router as BaseRouter, NextFunction, RouterOptions, LayerOptions, Middleware1Extended as Middleware1, Middleware2Extended as Middleware2, Injector } from '@akala/core';
import * as worker from '../worker-meta';
import { HttpRoute } from './route';
import { HttpLayer } from './layer';
export declare type httpHandler = (req: Response, res: Response) => void;
export declare type requestHandlerWithNext = (req: Request, res: Response, next: NextFunction) => void;
export declare type errorHandlerWithNext = (error: any, req: Request, res: Response, next: NextFunction) => void;
export declare type httpHandlerWithNext = requestHandlerWithNext | errorHandlerWithNext;
export interface Methods<T> {
    'checkout': T;
    'connect': T;
    'copy': T;
    'delete': T;
    'get': T;
    'head': T;
    'lock': T;
    'm-search': T;
    'merge': T;
    'mkactivity': T;
    'mkcalendar': T;
    'mkcol': T;
    'move': T;
    'notify': T;
    'options': T;
    'patch': T;
    'post': T;
    'prop': T;
    'find': T;
    'proppatch': T;
    'purge': T;
    'put': T;
    'report': T;
    'search': T;
    'subscribe': T;
    'trace': T;
    'unlock': T;
    'unsubscribe': T;
}
export interface Request extends http.IncomingMessage {
    ip: string;
    params: {
        [key: string]: any;
    };
    query: {
        [key: string]: any;
    };
    path: string;
    protocol: string;
    injector: Injector;
}
export interface Response extends http.ServerResponse {
    status(statusCode: number): Response;
    sendStatus(statusCode: number): Response;
    json(content: any): Response;
}
export declare class Router<T extends (Middleware1<any> | Middleware2<any, any>)> extends BaseRouter<T, HttpLayer<T>, HttpRoute<T>> implements Methods<(path: string, ...handlers: T[]) => Router<T>> {
    constructor(options: RouterOptions);
    protected buildLayer(path: string, options: LayerOptions, handler: T): HttpLayer<T>;
    protected buildRoute(path: string): HttpRoute<T>;
    'all': (path: string, ...handlers: T[]) => this;
    'checkout': (path: string, ...handlers: T[]) => this;
    'connect': (path: string, ...handlers: T[]) => this;
    'copy': (path: string, ...handlers: T[]) => this;
    'delete': (path: string, ...handlers: T[]) => this;
    'get': (path: string, ...handlers: T[]) => this;
    'head': (path: string, ...handlers: T[]) => this;
    'lock': (path: string, ...handlers: T[]) => this;
    'm-search': (path: string, ...handlers: T[]) => this;
    'merge': (path: string, ...handlers: T[]) => this;
    'mkactivity': (path: string, ...handlers: T[]) => this;
    'mkcalendar': (path: string, ...handlers: T[]) => this;
    'mkcol': (path: string, ...handlers: T[]) => this;
    'move': (path: string, ...handlers: T[]) => this;
    'notify': (path: string, ...handlers: T[]) => this;
    'options': (path: string, ...handlers: T[]) => this;
    'patch': (path: string, ...handlers: T[]) => this;
    'post': (path: string, ...handlers: T[]) => this;
    'prop': (path: string, ...handlers: T[]) => this;
    'find': (path: string, ...handlers: T[]) => this;
    'proppatch': (path: string, ...handlers: T[]) => this;
    'purge': (path: string, ...handlers: T[]) => this;
    'put': (path: string, ...handlers: T[]) => this;
    'report': (path: string, ...handlers: T[]) => this;
    'search': (path: string, ...handlers: T[]) => this;
    'subscribe': (path: string, ...handlers: T[]) => this;
    'trace': (path: string, ...handlers: T[]) => this;
    'unlock': (path: string, ...handlers: T[]) => this;
    'unsubscribe': (path: string, ...handlers: T[]) => this;
}
export declare class HttpRouter extends Router<httpHandlerWithNext> {
    constructor(options: RouterOptions);
    attachTo(server: http.Server): void;
    handle(req: any, res: any, ...rest: any[]): any;
    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    private static generateOptionsResponder(res, methods);
    private static trySendOptionsResponse(res, methods, next);
    private static sendOptionsResponse(res, methods);
}
export interface Callback {
    (status: number): any;
    (data: any): any;
    (status: number, data: any): any;
    (meta: CallbackResponse, data: any): any;
}
export interface CallbackResponse {
    headers?: {
        [header: string]: any;
    };
    statusCode?: number;
    statusMessage?: string;
}
export declare type workerRequestHandler = (req: worker.Request, callback: worker.Callback) => void;
export declare type workerErrorHandler = (error: any, req: worker.Request, callback: worker.Callback) => void;
export declare type workerHandler = workerRequestHandler | workerErrorHandler;
export declare class WorkerRouter extends Router<workerHandler> {
    constructor(options?: RouterOptions);
    handle(req: worker.Request, callback: Callback): any;
    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    private static generateOptionsResponder(res, methods);
    private static trySendOptionsResponse(res, methods, next);
    private static sendOptionsResponse(res, methods);
}
export declare function router(options?: RouterOptions): HttpRouter;
export declare function wrouter(options?: RouterOptions): WorkerRouter;
