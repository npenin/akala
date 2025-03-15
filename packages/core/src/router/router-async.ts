import { SpecialNextParam, convertToMiddleware } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { MiddlewareRouteAsync } from './route-async.js';
import { each } from '../each.js';
import { RouterOptions, Routes } from './router.js';
import { Routable, RouteBuilderArguments } from './route.js';
import { MiddlewareAsync } from '../middlewares/shared.js'
import { UriTemplate } from '../uri-template/index.js';

export type RouteBuilderAsync<T extends [Routable, ...unknown[]]> = (...args: RouteBuilderArguments) => MiddlewareRouteAsync<T>;

/**
 * Use routes asynchronously.
 * @param {Routes<T, Promise<unknown>>} routes - The routes to use.
 * @param {MiddlewareCompositeAsync<T> & { route: RouteBuilderAsync<T> }} [parent] - The parent middleware composite.
 * @returns {MiddlewareCompositeAsync<T>} The middleware composite.
 */
export function useRoutesAsync<T extends [Routable, ...unknown[]]>(routes: Routes<T, Promise<unknown>>, parent?: MiddlewareCompositeAsync<T> & { route: RouteBuilderAsync<T> }): MiddlewareCompositeAsync<T>
{
    if (!parent)
        parent = Object.assign(new MiddlewareCompositeAsync<T>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRouteAsync<T>(...args) } });
    each(routes, (route: ((...args: T) => Promise<unknown>) | Routes<T, Promise<unknown>>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRouteAsync(match as string);
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

/**
 * Asynchronous router.
 * @template T
 * @extends {MiddlewareCompositeAsync<T>}
 * @implements {MiddlewareAsync<T>}
 */
export class RouterAsync<T extends [{ path: string, params?: Record<string, unknown> }, ...unknown[]]> extends MiddlewareCompositeAsync<T> implements MiddlewareAsync<T>
{
    /**
     * Creates an instance of RouterAsync.
     * @param {RouterOptions} [options] - The router options.
     */
    constructor(options?: RouterOptions)
    {
        super(options && options.name);
    }

    /**
     * Creates a new route.
     * @param {...RouteBuilderArguments} args - The route builder arguments.
     * @returns {MiddlewareRouteAsync<T>} The middleware route.
     */
    public route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T>
    {
        return new MiddlewareRouteAsync<T>(...args);
    }

    /**
     * Use routes.
     * @param {Routes<T, Promise<unknown>>} routes - The routes to use.
     * @returns {this} The router instance.
     */
    public useRoutes(routes: Routes<T, Promise<unknown>>): this
    {
        useRoutesAsync(routes, this);
        return this;
    }

    /**
     * Use middleware.
     * @param {string | UriTemplate} route - The route or URI template.
     * @param {...MiddlewareAsync<T>} middlewares - The middlewares to use.
     * @returns {this} The router instance.
     */
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

    /**
     * Use middlewares.
     * @param {string | UriTemplate} route - The route or URI template.
     * @param {...((...args: T) => Promise<unknown>)} middlewares - The middlewares to use.
     * @returns {this} The router instance.
     */
    public use(route: string | UriTemplate, ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(...middlewares: ((...args: T) => Promise<unknown>)[]): this
    public use(route: string | UriTemplate | ((...args: T) => Promise<unknown>), ...middlewares: ((...args: T) => Promise<unknown>)[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRouteAsync<T>(route);
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
