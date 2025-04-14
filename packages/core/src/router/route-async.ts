import { MiddlewarePromise, NotHandled, SpecialNextParam, MiddlewareAsync } from '../middlewares/shared.js';
import { MiddlewareCompositeAsync } from '../middlewares/composite-async.js';
import { Routable, RouteBuilderArguments } from "./route.js";
import { UriTemplate } from '../uri-template/index.js';
import { UrlTemplate } from '../index.js';

/**
 * Represents an asynchronous route handler for URI template matching in middleware chains.
 * 
 * This middleware class processes routes using URI templates and manages asynchronous middleware execution.
 * 
 * @template T - The context type containing the routable request and parameters.
 * @template TSpecialNextParam - The type for special next parameters (defaults to {@link SpecialNextParam})
 */
export class MiddlewareRouteAsync<T extends [Routable, ...unknown[]], TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends MiddlewareCompositeAsync<T, TSpecialNextParam>
{
    /**
     * Creates an instance of MiddlewareRouteAsync with a route path or URI template.
     * @template T - The context type containing the routable request and parameters.
     * @template TSpecialNextParam - The type for special next parameters (defaults to SpecialNextParam)
     * @param {string | UriTemplate} route - The route path or URI template defining the route.
     */
    constructor(route: string | UriTemplate)
    {
        super(route.toString());
        this.routePath = Array.isArray(route) ? route : UrlTemplate.parse(route);
    }

    /**
     * Parsed URI template used for route matching
     * 
     * @type {UriTemplate}
     */
    routePath!: UriTemplate;

    /**
     * Creates a new route configuration chain with optional parameters.
     * 
     * @function route
     * @param {...RouteBuilderArguments} args - Route configuration parameters (method, path, etc.)
     * @returns {MiddlewareRouteAsync<T, TSpecialNextParam>} Newly created route instance
     */
    route(...args: RouteBuilderArguments): MiddlewareRouteAsync<T, TSpecialNextParam>
    {
        return new MiddlewareRouteAsync<T, TSpecialNextParam>(...args);
    }

    /**
     * Optional predicate to determine route applicability
     * 
     * A function that checks if the route should handle the current request
     * 
     * @type {(x: T[0]) => boolean}
     */
    isApplicable?: (x: T[0]) => boolean;

    /**
     * Executes the route's middleware chain asynchronously.
     * 
     * @param {...T} context - Execution context containing the routable request and parameters
     * @returns {MiddlewarePromise<TSpecialNextParam>} Resolution promise indicating completion
     */
    async handle(...context: T): MiddlewarePromise<TSpecialNextParam>
    {
        const req = context[0] as Routable;
        const isMatch = UrlTemplate.match(req.path, this.routePath);

        if (isMatch && (!this.isApplicable || this.isApplicable(req)))
        {
            const oldPath = req.path;
            const c = oldPath[oldPath.length - isMatch.remainder.length];
            if (c && c !== '/')
                return NotHandled;
            req.path = isMatch.remainder || '/';

            const oldParams = req.params;
            req.params = isMatch.variables;

            try
            {
                return super.handle(...context);
            }
            finally
            {
                req.params = oldParams;
                req.path = oldPath;
            }
        }
        return NotHandled;
    }

    /**
     * Adds middleware to the route chain, supporting route definitions and middleware functions.
     * 
     * @function useMiddleware
     * @param {string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>} routeOrMiddleware - 
     *   Either a route definition (string/UriTemplate) or a middleware function
     * @param {...MiddlewareAsync<T, TSpecialNextParam>} middlewares - Additional middleware functions
     * @returns {this} Current middleware instance for method chaining
     */
    public useMiddleware(...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]): this;
    public useMiddleware(
        routeOrMiddleware: string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>,
        ...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]
    ): this;
    public useMiddleware(routeOrMiddleware: string | UriTemplate | MiddlewareAsync<T, TSpecialNextParam>, ...middlewares: MiddlewareAsync<T, TSpecialNextParam>[]): this
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
     *   Route definition (string/UriTemplate) or handler function
     * @param {...((...args: T) => Promise<unknown>)} handlers - Additional handler functions
     * @returns {this} Current middleware instance for method chaining
     */
    public use(routeOrHandler: string | UriTemplate, ...handlers: ((...args: T) => Promise<unknown>)[]): this;
    public use(...handlers: ((...args: T) => Promise<unknown>)[]): this;
    public use(routeOrHandler: string | UriTemplate | ((...args: T) => Promise<unknown>), ...handlers: ((...args: T) => Promise<unknown>)[]): this
    {
        if (typeof routeOrHandler === 'string' || Array.isArray(routeOrHandler))
        {
            const routed = new MiddlewareRouteAsync<T, TSpecialNextParam>(routeOrHandler);
            routed.use(...handlers);
            return super.useMiddleware(routed);
        }

        return super.use(routeOrHandler, ...handlers);
    }
}
