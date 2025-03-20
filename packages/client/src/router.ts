import { Middleware, MiddlewareRoute, OptionsResponse, RouterAsync, Routable, RouteBuilderArguments, RouterOptions, MiddlewareResult, SpecialNextParam } from '@akala/core';

export class RouterRequest 
{
    constructor(loc: string)
    {
        this.path = loc || '/';
        this.url = new URL(this.path, new URL(window.location.href, document.baseURI));
        this.query = this.url.searchParams;
    }

    public path: string;
    public url: URL;
    public query: URLSearchParams;
    public params: Record<string, unknown>;
}

export class Router extends RouterAsync<[RouterRequest & Routable]>
{
    constructor(options?: RouterOptions)
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

export class MethodMiddleware<T extends simpleRequest & Routable, U extends unknown[], TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends MiddlewareRoute<[T, ...U], TSpecialNextParam> implements Middleware<[T, ...U], TSpecialNextParam>
{
    constructor(private method: string, ...args: RouteBuilderArguments)
    {
        super(...args);
    }

    public isApplicable = (req: simpleRequest): boolean => req.method == this.method;

    public handle(req: simpleRequest | T, ...args: U): MiddlewareResult<TSpecialNextParam>
    {
        const routableRequest: T = req as T;
        if (!isRoutable(req))
            routableRequest.path = req.url
        return super.handle(routableRequest, ...args);
    }
    public handleError(error: Error | OptionsResponse, req: simpleRequest | T, ...args: U): MiddlewareResult<TSpecialNextParam>
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
