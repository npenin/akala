import { Middleware, SpecialNextParam, convertToMiddleware } from '../middlewares/shared.js';
import { MiddlewareComposite } from '../middlewares/composite-sync.js';
import { MiddlewareRoute, Routable, RouteBuilder, RouteBuilderArguments } from './route.js';
import { each } from '../each.js';
import { UriTemplate } from '../uri-template/index.js';

export interface RouterOptions
{
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;
    length?: number;
    separator?: string;
    name?: string;
}

export type Routes<T extends [Routable, ...unknown[]], TReturnType> = { [key: string]: ((...args: T) => TReturnType) | Routes<T, TReturnType> };

export type ParamCallback<T> = (req, paramVal: unknown, name: string, ...rest) => Promise<T>;

export function useRoutes<T extends [Routable, ...unknown[]], TReturnType>(routes: Routes<T, TReturnType>, parent?: MiddlewareComposite<T> & { route: RouteBuilder<T> }): MiddlewareComposite<T>
{
    if (!parent)
        parent = Object.assign(new MiddlewareComposite<T>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRoute<T>(...args) } });
    each(routes, (route: ((...args: T) => TReturnType) | Routes<T, TReturnType>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRoute(match as string);
        if (typeof (route) == 'object')
        {
            useRoutes(route, routed);
        }
        else
            routed.useMiddleware(convertToMiddleware<T, SpecialNextParam>(route));

        parent.useMiddleware(routed);
    });
    return parent;
}

export class Router<T extends [{ path: string, params?: Record<string, unknown> }, ...unknown[]]> extends MiddlewareComposite<T> implements Middleware<T>
{
    constructor(options?: RouterOptions)
    {
        super(options && options.name);
    }

    public route(...args: RouteBuilderArguments): MiddlewareRoute<T>
    {
        return new MiddlewareRoute<T>(...args);
    }

    public useRoutes(routes: Routes<T, unknown>): this
    {
        useRoutes(routes, this);
        return this;
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
            super.useMiddleware(routed);
            return this;
        }
        else
            return super.use(route, ...middlewares);
    }
}


// // create Router#VERB functions
// methods.concat('all').forEach(function (method)
// {
//     Router.prototype[method] = function (path)
//     {
//         var route = this.route(path)
//         route[method].apply(route, slice.call(arguments, 1))
//         return this
//     }
// })