import * as http from 'http';
import * as akala from '@akala/core';
import * as jsonrpc from '@akala/json-rpc-ws'
import { HttpRouter } from './router.js';
import { requestHandler } from './shared.js';
import { convertToMiddleware, Middleware, MiddlewareComposite } from '@akala/core';
import { HttpRouteMiddleware } from './route.js';
import { Request, Response } from './shared.js'

export * from './route.js'
export * from './router.js'
export * from './shared.js'
export * from './upgradeMiddleware.js'

export interface Callback
{
    (status: number): void;
    (data: unknown): void;
    (status: number, data: unknown): void;
    (meta: CallbackResponse, data: unknown): void;
    redirect(url: string);
    sendFile?(path: string, options?: unknown, callback?: akala.NextFunction)
}

export interface CallbackResponse
{
    headers?: { [header: string]: string | number };
    statusCode?: number;
    statusMessage?: string;
    data?: jsonrpc.PayloadDataType<unknown> | string;
}

export function router(options?: akala.RouterOptions): HttpRouter
{
    return new HttpRouter(options);
}

// create Router#VERB functions
http.METHODS.concat('all').forEach(function (method)
{
    method = method.toLowerCase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    MiddlewareComposite.prototype[method] = function (this: MiddlewareComposite<[Request, Response]>, path: string, ...rest: requestHandler[])
    {
        return this[method + 'Middleware'](path, ...rest.map(convertToMiddleware));
    }

    MiddlewareComposite.prototype[method + 'Middleware'] = function (this: MiddlewareComposite<[Request, Response]>, path: string, ...rest: Middleware<[Request, Response]>[])
    {
        const route = new HttpRouteMiddleware(method, path);
        route.useMiddleware(...rest);
        this.useMiddleware(route);
        return this;
    }
})

// declare module '@akala/core'
// {
//     interface ExtendableCompositeMiddleware<T extends unknown[]> extends Middleware<T>
//     {
//         'checkoutMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'connectMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'copyMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'deleteMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'getMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'headMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'lockMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'mMiddleware-search'(path: string, ...middlewares: Middleware<T>[]): this;
//         'mergeMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'mkactivityMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'mkcalendarMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'mkcolMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'moveMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'notifyMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'optionsMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'patchMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'postMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'propMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'findMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'proppatchMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'purgeMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'putMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'reportMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'searchMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'subscribeMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'traceMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'unlockMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;
//         'unsubscribeMiddleware'(path: string, ...middlewares: Middleware<T>[]): this;

//         'checkout'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'connect'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'copy'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'delete'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'get'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'head'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'lock'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'm-search'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'merge'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'mkactivity'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'mkcalendar'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'mkcol'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'move'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'notify'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'options'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'patch'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'post'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'prop'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'find'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'proppatch'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'purge'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'put'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'report'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'search'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'subscribe'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'trace'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'unlock'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//         'unsubscribe'(path: string, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
//     }
// }