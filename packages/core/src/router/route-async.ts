import { MiddlewarePromise } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { Routable, RouteBuilderArguments } from "./route.js";
import { MiddlewareAsync } from "../middlewares/shared.js";
import { UriTemplate } from '../uri-template/index.js';
import { UrlTemplate } from '../index.js';

/**
 * Asynchronous route handler.
 * @param {string} path - The route path.
 * @param {Function} handler - The route handler function.
 */
export class MiddlewareRouteAsync<T extends [Routable, ...unknown[]]> extends MiddlewareCompositeAsync<T>
{
    routePath: UriTemplate;
    constructor(route: string | UriTemplate)
    {
        super(route.toString());

        this.routePath = Array.isArray(route) ? route : UrlTemplate.parse(route);
    }

    route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T>
    {
        return new MiddlewareRouteAsync<T>(...args);
    }

    isApplicable?: (x: T[0]) => boolean;

    handle(...context: T): MiddlewarePromise
    {
        const req = context[0] as Routable;
        const isMatch = UrlTemplate.match(req.path, this.routePath);

        if (isMatch && (!this.isApplicable || this.isApplicable(req)))
        {
            const oldPath = req.path;
            const c = oldPath[oldPath.length - isMatch.remainder.length];
            if (c && c !== '/')
                return Promise.resolve();
            req.path = isMatch.remainder || '/';

            const oldParams = req.params;
            req.params = isMatch.variables;

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

    public useMiddleware(route: string | UriTemplate, ...middlewares: MiddlewareAsync<T>[]): this
    public useMiddleware(...middlewares: MiddlewareAsync<T>[]): this
    public useMiddleware(route: string | UriTemplate | MiddlewareAsync<T>, ...middlewares: MiddlewareAsync<T>[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRouteAsync<T>(route);
            routed.useMiddleware(...middlewares);
            super.useMiddleware(routed);
        }
        else
            super.useMiddleware(route, ...middlewares);
        return this;
    }

    public use(route: string | UriTemplate, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(route: string | UriTemplate | ((...args: T) => Promise<unknown>), ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRouteAsync<T>(route);
            routed.use(...middlewares);
            return super.useMiddleware(routed);
        }
        return super.use(route, ...middlewares);
    }
}
