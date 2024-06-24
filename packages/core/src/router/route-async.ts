import { Key, ParseOptions, pathToRegexp, TokensToRegexpOptions, regexpToFunction, RegexpToFunctionOptions, MatchFunction } from "path-to-regexp";
import { MiddlewarePromise } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { Routable, RouteBuilderArguments } from "./route.js";
import { MiddlewareAsync } from "../middlewares/shared.js";

export class MiddlewareRouteAsync<T extends [Routable, ...unknown[]]> extends MiddlewareCompositeAsync<T>
{
    params: Key[];
    match: MatchFunction<{ path: string, index: number, params: Record<string, string> }>;
    delimiter: string;
    constructor(route: string | RegExp, options?: TokensToRegexpOptions & ParseOptions & RegexpToFunctionOptions)
    {
        super(route.toString());
        this.params = [];
        this.delimiter = options && options.delimiter || '/';

        const routePath = pathToRegexp(route, this.params, options);
        this.match = regexpToFunction<{ path: string, index: number, params: Record<string, string> }>(routePath, this.params, options);
    }

    route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T>
    {
        return new MiddlewareRouteAsync<T>(...args);
    }

    isApplicable?: (x: T[0]) => boolean;

    handle(...context: T): MiddlewarePromise
    {
        const req = context[0] as Routable;
        const isMatch = this.match(req.path);

        if (isMatch && (!this.isApplicable || this.isApplicable(req)))
        {
            const oldPath = req.path;
            const c = oldPath[isMatch.path.length];
            if (c && c !== this.delimiter)
                return Promise.resolve();
            req.path = req.path.substring(isMatch.path.length) || this.delimiter;

            const oldParams = req.params;
            req.params = isMatch.params;

            try
            {
                return super.handle(...(context as unknown as T))
            }
            finally
            {
                req.params = oldParams;
                req.path = oldPath;
            };
        }
        return Promise.resolve();
    }

    public useMiddleware(route: string | RegExp, ...middlewares: MiddlewareAsync<T>[]): this
    public useMiddleware(...middlewares: MiddlewareAsync<T>[]): this
    public useMiddleware(route: string | RegExp | MiddlewareAsync<T>, ...middlewares: MiddlewareAsync<T>[]): this
    {
        if (typeof route === 'string' || route instanceof RegExp)
        {
            const routed = new MiddlewareRouteAsync<T>(route, { end: false });
            routed.useMiddleware(...middlewares);
            super.useMiddleware(routed);
        }
        else
            super.useMiddleware(route, ...middlewares);
        return this;
    }

    public use(route: string | RegExp, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(route: string | RegExp | ((...args: T) => Promise<unknown>), ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        if (typeof route === 'string' || route instanceof RegExp)
        {
            const routed = new MiddlewareRouteAsync<T>(route, { end: false });
            routed.use(...middlewares);
            return super.useMiddleware(routed);
        }
        return super.use(route, ...middlewares);
    }
}