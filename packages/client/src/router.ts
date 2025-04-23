import { Middleware, MiddlewareRoute, OptionsResponse, RouterAsync, Routable, RouteBuilderArguments, RouterOptions, MiddlewareResult, SpecialNextParam } from '@akala/core';

/**
 * Represents a request object containing routing information.
 */
export class RouterRequest 
{
    /**
     * Creates a new RouterRequest instance.
     * @param loc The location path (default: '/').
     */
    constructor(loc: string)
    {
        this.path = loc || '/';
        this.url = new URL(this.path, new URL(window.location.href, document.baseURI));
        this.query = this.url.searchParams;
    }

    /** The path of the request. */
    public path: string;

    /** The full URL object of the request. */
    public url: URL;

    /** Query parameters from the URL. */
    public query: URLSearchParams;

    /** Dynamic route parameters extracted from the path. */
    public params: Record<string, unknown>;
}

/**
 * Routing class for handling client-side routes.
 * Extends RouterAsync to provide asynchronous routing capabilities.
 */
export class Router extends RouterAsync<[RouterRequest & Routable]>
{
    /**
     * Creates a new Router instance.
     * @param options Configuration options for the router.
     */
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}

/**
 * Factory function for creating a new Router instance.
 * @param name Optional name for the router instance.
 * @returns A configured Router instance.
 */
export function router(name?: string): Router
{
    const proto = new Router({ name: name });

    return proto;
}

export type simpleRequest = { method: string, url: string };

/**
 * Middleware class for handling HTTP method-specific routing logic.
 * @template T The request type extending simpleRequest & Routable
 * @template U Additional arguments for the middleware handler
 * @template TSpecialNextParam Special next parameter type
 */
export class MethodMiddleware<T extends simpleRequest & Routable, U extends unknown[], TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends MiddlewareRoute<[T, ...U], TSpecialNextParam> implements Middleware<[T, ...U], TSpecialNextParam>
{
    /**
     * Creates a new MethodMiddleware instance.
     * @param method HTTP method this middleware handles (e.g., 'GET', 'POST')
     * @param args Route builder arguments
     */
    constructor(private method: string, ...args: RouteBuilderArguments)
    {
        super(...args);
    }

    /**
     * Checks if the middleware is applicable for the given request.
     * @param req The request object
     * @returns True if the request method matches the middleware's method
     */
    public isApplicable = (req: simpleRequest): boolean => req.method == this.method;

    /**
     * Handles incoming requests by ensuring proper routable request structure.
     * @param req The incoming request
     * @param args Additional arguments
     * @returns Middleware result
     */
    public handle(req: simpleRequest | T, ...args: U): MiddlewareResult<TSpecialNextParam>
    {
        const routableRequest: T = req as T;
        if (!isRoutable(req))
            routableRequest.path = req.url
        return super.handle(routableRequest, ...args);
    }

    /**
     * Handles errors by ensuring proper routable request structure before propagating.
     * @param error Error or response object
     * @param req The incoming request
     * @param args Additional arguments
     * @returns Middleware result
     */
    public handleError(error: Error | OptionsResponse, req: simpleRequest | T, ...args: U): MiddlewareResult<TSpecialNextParam>
    {
        const routableRequest: T = req as T;
        if (!isRoutable(req))
            routableRequest.path = req.url
        return super.handleError(error, routableRequest, ...args);
    }
}

/**
 * Type guard to check if an object is a Routable type.
 * @param x The object to check
 * @returns True if the object has a 'path' property of type string
 */
function isRoutable(x: unknown): x is Routable
{
    return x && typeof (x['path']) === 'string';
}
