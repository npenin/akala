import { UrlTemplate } from '../index.js';
import { MiddlewareComposite } from '../middlewares/composite-sync.js';
import { Middleware, MiddlewareResult } from '../middlewares/shared.js';
import { UriTemplate } from '../uri-template/index.js';

export interface Routable
{
    path: string;
    params?: Record<string, unknown>
}

export type RouteBuilderArguments = [route: string | UriTemplate]
export type RouteBuilder<T extends [Routable, ...unknown[]]> = (...args: RouteBuilderArguments) => MiddlewareRoute<T>;


export class MiddlewareRoute<T extends [Routable, ...unknown[]]> extends MiddlewareComposite<T>
{
    // delimiter: string;
    routePath: UriTemplate;
    constructor(route: string | UriTemplate)
    {
        super(route.toString());
        // this.delimiter = options && options.delimiter || '/';

        this.routePath = Array.isArray(route) ? route : UrlTemplate.parse(route);
        // if ('keys' in routePath)
        //     this.params = routePath.keys;

        // this.match = match(route.toString(), options)
    }

    route(...args: RouteBuilderArguments): MiddlewareRoute<T>
    {
        return new MiddlewareRoute<T>(...args);
    }

    isApplicable?: (x: T[0]) => boolean;

    handle(...context: T): MiddlewareResult
    {
        const req = context[0] as Routable;
        const isMatch = UrlTemplate.match(req.path, this.routePath);

        if (isMatch && (!this.isApplicable || this.isApplicable(req)))
        {
            const oldPath = req.path;
            const c = oldPath[oldPath.length - isMatch.remainder.length];
            if (c && c !== '/')
                return;
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
        return;
    }

    public useMiddleware(route: string | UriTemplate, ...middlewares: Middleware<T>[]): this
    public useMiddleware(...middlewares: Middleware<T>[]): this
    public useMiddleware(route: string | UriTemplate | Middleware<T>, ...middlewares: Middleware<T>[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRoute<T>(route);
            routed.useMiddleware(...middlewares);
            super.useMiddleware(routed);
        }
        else
            super.useMiddleware(route, ...middlewares);
        return this;
    }

    public use(route: string | UriTemplate, ...middlewares: ((...args: T) => unknown)[]): this
    public use(...middlewares: ((...args: T) => unknown)[]): this
    public use(route: string | UriTemplate | ((...args: T) => unknown), ...middlewares: ((...args: T) => unknown)[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRoute<T>(route);
            routed.use(...middlewares);
            return super.useMiddleware(routed);
        }
        return super.use(route, ...middlewares);
    }
}
