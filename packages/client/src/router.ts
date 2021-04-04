import * as akala from '@akala/core'
import { Middleware, MiddlewarePromise, MiddlewareRoute, OptionsResponse, Routable, RouteBuilderArguments } from '@akala/core';

export class RouterRequest 
{
    constructor(loc: string)
    {
        this.path = loc || '/';
        this.url = new URL(this.path);
        this.query = this.url.searchParams;
    }

    public path: string;
    public url: URL;
    public query: URLSearchParams;
    public params: Record<string, unknown>;
}

if (!window['setImmediate'])
    window['setImmediate'] = function (fn, ...args: unknown[])
    {
        return setTimeout(function ()
        {
            fn.apply(this, args)
        }, 0);
    } as unknown as typeof setImmediate



export class Router extends akala.Router<[RouterRequest & Routable]>
{
    constructor(options?: akala.RouterOptions)
    {
        super(options)
    }
}

export function router(name?: string): Router
{
    const proto = new Router({ name: name });

    return proto;
}

export type simpleRequest = { method: string, url: string };

export class MethodMiddleware<T extends simpleRequest & Routable, U extends unknown[]> extends MiddlewareRoute<[T, ...U]> implements Middleware<[T, ...U]>
{
    constructor(private method: string, ...args: RouteBuilderArguments)
    {
        super(...args);
    }

    public isApplicable = (req: simpleRequest): boolean => req.method == this.method;

    public handle(req: simpleRequest | T, ...args: U): MiddlewarePromise
    {
        const routableRequest: T = req as T;
        if (!isRoutable(req))
            routableRequest.path = req.url
        return super.handle(routableRequest, ...args);
    }
    public handleError(error: Error | OptionsResponse, req: simpleRequest | T, ...args: U): MiddlewarePromise
    {
        const routableRequest: T = req as T;
        if (!isRoutable(req))
            routableRequest.path = req.url
        return super.handleError(error, routableRequest, ...args);
    }
}

function isRoutable(x: unknown): x is Routable
{
    return x && typeof (x['path']) === 'string';
}