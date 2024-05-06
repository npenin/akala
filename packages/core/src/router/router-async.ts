import { Middleware, SpecialNextParam, convertToMiddleware } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { MiddlewareRouteAsync } from './route-async.js';
import { each } from '../each.js';
import { RouterOptions, Routes } from './router.js';
import { Routable, RouteBuilderArguments } from './route.js';
import { MiddlewareAsync } from '../middlewares/shared.js'

export type RouteBuilderAsync<T extends [Routable, ...unknown[]]> = (...args: RouteBuilderArguments) => MiddlewareRouteAsync<T>;

export function useRoutesAsync<T extends [Routable, ...unknown[]]>(routes: Routes<T, Promise<unknown>>, parent?: MiddlewareCompositeAsync<T> & { route: RouteBuilderAsync<T> }): MiddlewareCompositeAsync<T>
{
    if (!parent)
        parent = Object.assign(new MiddlewareCompositeAsync<T>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRouteAsync<T>(...args) } });
    each(routes, (route: ((...args: T) => Promise<unknown>) | Routes<T, Promise<unknown>>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRouteAsync(match as string, { end: typeof (route) == 'object' });
        if (typeof (route) == 'object')
        {
            useRoutesAsync(route, routed);
        }
        else
            routed.useMiddleware(convertToMiddleware<T, SpecialNextParam>(route));

        parent.useMiddleware(routed);
    });
    return parent;
}

export class RouterAsync<T extends [{ path: string, params?: Record<string, unknown> }, ...unknown[]]> extends MiddlewareCompositeAsync<T> implements MiddlewareAsync<T>
{
    constructor(options?: RouterOptions)
    {
        super(options && options.name);
    }

    public route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T>
    {
        return new MiddlewareRouteAsync<T>(...args);
    }

    public useRoutes(routes: Routes<T, Promise<unknown>>): this
    {
        useRoutesAsync(routes, this);
        return this;
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