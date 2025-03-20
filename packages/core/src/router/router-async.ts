import { SpecialNextParam, convertToMiddleware } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { MiddlewareRouteAsync } from './route-async.js';
import { each } from '../each.js';
import { RouterOptions, Routes } from './router.js';
import { Routable, RouteBuilderArguments } from './route.js';
import { MiddlewareAsync } from '../middlewares/shared.js'
import { UriTemplate } from '../uri-template/index.js';

export type RouteBuilderAsync<T extends [Routable, ...unknown[]], TSpecialNextParam extends SpecialNextParam = SpecialNextParam> = (...args: RouteBuilderArguments) => MiddlewareRouteAsync<T, TSpecialNextParam>;

/**
 * Dynamically applies asynchronous routes to a middleware composite.
 * 
 * This function recursively processes route definitions and attaches them to the parent middleware chain.
 * 
 * @template T - The context type containing the routable request and parameters.
 * @template TSpecialNextParam - The type for special next parameters (defaults to {@link SpecialNextParam})
 * @param {Routes<T, Promise<unknown>, TSpecialNextParam>} routes - Route definitions mapping URI templates to handler functions or nested route objects
 * @param {MiddlewareCompositeAsync<T, TSpecialNextParam> & { route: RouteBuilderAsync<T, TSpecialNextParam> }} [parent] - Parent middleware container to attach routes to
 * @returns {MiddlewareCompositeAsync<T, TSpecialNextParam>} Configured middleware composite with attached routes
 */
export function useRoutesAsync<T extends [Routable, ...unknown[]], TSpecialNextParam extends SpecialNextParam = SpecialNextParam>(
    routes: Routes<T, Promise<unknown>, TSpecialNextParam>,
    parent?: MiddlewareCompositeAsync<T, TSpecialNextParam> & { route: RouteBuilderAsync<T, TSpecialNextParam> }
): MiddlewareCompositeAsync<T, TSpecialNextParam>
{
    if (!parent)
        parent = Object.assign(new MiddlewareCompositeAsync<T, TSpecialNextParam>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRouteAsync<T, TSpecialNextParam>(...args) } });
    each(routes, (route: ((...args: T) => Promise<unknown>) | Routes<T, Promise<unknown>, TSpecialNextParam>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRouteAsync<T, TSpecialNextParam>(match as string);
        if (typeof (route) == 'object')
        {
            useRoutesAsync(route, routed);
        }
        else
            routed.useMiddleware(convertToMiddleware<T, TSpecialNextParam>(route));

        parent.useMiddleware(routed);
    });
    return parent;
}

/**
 * Base class for defining asynchronous routing middleware chains.
 * 
 * Extends the middleware composite to provide route configuration capabilities for asynchronous handlers.
 * 
 * @template T - The context type containing the routable request and parameters
 * @template TSpecialNextParam - The type for special next parameters (defaults to {@link SpecialNextParam})
 * @extends {MiddlewareCompositeAsync<T, TSpecialNextParam>}
 * @implements {MiddlewareAsync<T, TSpecialNextParam>}
 */
export class RouterAsync<
    T extends [{ path: string; params?: Record<string, unknown> }, ...unknown[]],
    TSpecialNextParam extends SpecialNextParam = SpecialNextParam
> extends MiddlewareCompositeAsync<T, TSpecialNextParam> implements MiddlewareAsync<T, TSpecialNextParam>
{
    /**
     * Creates a new RouterAsync instance with optional configuration.
     * 
     * @param {RouterOptions} [options] - Configuration options including middleware priority and name
     */
    constructor(options?: RouterOptions)
    {
        super(options?.name);
    }

    /**
     * Creates a new route configuration chain for defining route handlers.
     * 
     * @function route
     * @param {...RouteBuilderArguments} args - Route configuration parameters (path template, HTTP method, etc.)
     * @returns {MiddlewareRouteAsync<T, TSpecialNextParam>} Newly created route configuration instance
     */
    public route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T, TSpecialNextParam>
    {
        return new MiddlewareRouteAsync<T, TSpecialNextParam>(...args);
    }

    /**
     * Attaches a collection of route definitions to the router.
     * 
     * @param {Routes<T, Promise<unknown>, TSpecialNextParam>} routes - Route definitions to be applied
     * @returns {this} Current router instance for method chaining
     */
    public useRoutes(routes: Routes<T, Promise<unknown>, TSpecialNextParam>): this
    {
        useRoutesAsync(routes, this);
        return this;
    }

    /**
     * Adds middleware to the router's chain either globally or for a specific route.
     * 
     * @function useMiddleware
     * @param {string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>} routeOrMiddleware - 
     *   Route definition (string/URI template) or middleware function
     * @param {...MiddlewareAsync<T, TSpecialNextParam>} middlewares - Additional middleware functions
     * @returns {this} Current router instance for method chaining
     */
    public useMiddleware(...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]): this;
    public useMiddleware(
        routeOrMiddleware: string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>,
        ...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]
    ): this;
    public useMiddleware(
        routeOrMiddleware: string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>,
        ...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]
    ): this
    {
        if (typeof routeOrMiddleware === 'string' || Array.isArray(routeOrMiddleware))
        {
            const routed = new MiddlewareRouteAsync<T, TSpecialNextParam>(routeOrMiddleware);
            routed.useMiddleware(...middlewares);
            super.useMiddleware(routed);
        }
        else
            super.useMiddleware(routeOrMiddleware, ...middlewares);
        return this;
    }

    /**
     * Registers route handlers or middleware functions.
     * 
     * @function use
     * @param {(string | UriTemplate | ((...args: T) => Promise<unknown>))} routeOrHandler - 
     *   Route definition (string/URI template) or handler function
     * @param {...((...args: T) => Promise<unknown>)} handlers - Additional handler functions
     * @returns {this} Current router instance for method chaining
     */
    public use(routeOrHandler: string | UriTemplate, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
    public use(...handlers: ((...args: T) => Promise<unknown>)[]): this;
    public use(routeOrHandler: string | UriTemplate | ((...args: T) => Promise<unknown>), ...handlers: ((...args: T) => Promise<unknown>)[]): this
    {
        if (typeof routeOrHandler === 'string' || Array.isArray(routeOrHandler))
        {
            const routed = new MiddlewareRouteAsync<T, TSpecialNextParam>(routeOrHandler);
            routed.use(...handlers);
            super.useMiddleware(routed);
            return this;
        }
        else
            return super.use(routeOrHandler, ...handlers);
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
