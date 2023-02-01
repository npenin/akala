import { Middleware } from './shared.js';
import { convertToMiddleware, MiddlewareComposite } from './composite.js';
import { MiddlewareRoute, Routable, RouteBuilder, RouteBuilderArguments } from './route.js';
import { each } from '../each.js';

export interface RouterOptions
{
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;
    length?: number;
    separator?: string;
    name?: string;
}

export type Routes<T extends [Routable, ...unknown[]]> = { [key: string]: ((...args: T) => Promise<unknown>) | Routes<T> };

export type ParamCallback<T> = (req, paramVal: unknown, name: string, ...rest) => Promise<T>;

export function useRoutes<T extends [Routable, ...unknown[]]>(routes: Routes<T>, parent?: MiddlewareComposite<T> & { route: RouteBuilder<T> }): MiddlewareComposite<T>
{
    if (!parent)
        parent = Object.assign(new MiddlewareComposite<T>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRoute<T>(...args) } });
    each(routes, (route: ((...args: T) => Promise<unknown>) | Routes<T>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRoute(match as string, { end: typeof (route) == 'object' });
        if (typeof (route) == 'object')
        {
            useRoutes(route, routed);
        }
        else
            routed.useMiddleware(convertToMiddleware<T>(route));

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

    public useRoutes(routes: Routes<T>): this
    {
        useRoutes(routes, this);
        return this;
    }

    public useMiddleware(route: string | RegExp, ...middlewares: Middleware<T>[]): this
    public useMiddleware(...middlewares: Middleware<T>[]): this
    public useMiddleware(route: string | RegExp | Middleware<T>, ...middlewares: Middleware<T>[]): this
    {
        if (typeof route === 'string' || route instanceof RegExp)
        {
            const routed = new MiddlewareRoute<T>(route, { end: false });
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
            const routed = new MiddlewareRoute<T>(route, { end: false });
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