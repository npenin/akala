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

export type Routes<T extends [Routable, ...unknown[]], TReturnType, TSpecialNextParam extends SpecialNextParam = SpecialNextParam> = { [key: string]: ((...args: T) => TReturnType) | Routes<T, TReturnType, TSpecialNextParam> };

export type ParamCallback<T> = (req, paramVal: unknown, name: string, ...rest) => Promise<T>;

/**
 * Use routes.
 * @param {Routes<T, TReturnType>} routes - The routes.
 * @param {MiddlewareComposite<T> & { route: RouteBuilder<T> }} [parent] - The parent middleware composite.
 * @returns {MiddlewareComposite<T>} The middleware composite.
 */
export function useRoutes<T extends [Routable, ...unknown[]], TReturnType, TSpecialNextParam extends SpecialNextParam = SpecialNextParam>(routes: Routes<T, TReturnType, TSpecialNextParam>, parent?: MiddlewareComposite<T> & { route: RouteBuilder<T, TSpecialNextParam> }): MiddlewareComposite<T>
{
    if (!parent)
        parent = Object.assign(new MiddlewareComposite<T, TSpecialNextParam>('byroutes'), { route(...args: RouteBuilderArguments) { return new MiddlewareRoute<T, TSpecialNextParam>(...args) } });
    each(routes, (route: ((...args: T) => TReturnType) | Routes<T, TReturnType, TSpecialNextParam>, match) =>
    {
        if (typeof match == 'number')
            return;
        const routed = new MiddlewareRoute<T, TSpecialNextParam>(match as string);
        if (typeof (route) == 'object')
        {
            useRoutes(route, routed);
        }
        else
            routed.useMiddleware(convertToMiddleware<T, TSpecialNextParam>(route));

        parent.useMiddleware(routed);
    });
    return parent;
}

/**
 * Router class.
 * @template T
 * @extends {MiddlewareComposite<T>}
 * @implements {Middleware<T>}
 */
export class Router<T extends [{ path: string, params?: Record<string, unknown> }, ...unknown[]], TSpecialNextParam extends SpecialNextParam = SpecialNextParam> extends MiddlewareComposite<T, TSpecialNextParam> implements Middleware<T, TSpecialNextParam>
{
    /**
     * Creates an instance of Router.
     * @param {RouterOptions} [options] - The router options.
     */
    constructor(options?: RouterOptions)
    {
        super(options && options.name);
    }

    /**
     * Creates a new route.
     * @param {...RouteBuilderArguments} args - The route builder arguments.
     * @returns {MiddlewareRoute<T>} The middleware route.
     */
    public route(...args: RouteBuilderArguments): MiddlewareRoute<T, TSpecialNextParam>
    {
        return new MiddlewareRoute<T, TSpecialNextParam>(...args);
    }

    /**
     * Uses routes.
     * @param {Routes<T, unknown>} routes - The routes.
     * @returns {this} The router instance.
     */
    public useRoutes(routes: Routes<T, unknown, TSpecialNextParam>): this
    {
        useRoutes(routes, this);
        return this;
    }

    /**
     * Uses middleware.
     * @param {string | UriTemplate} route - The route.
     * @param {...Middleware<T>} middlewares - The middlewares.
     * @returns {this} The router instance.
     */
    public useMiddleware(route: string | UriTemplate, ...middlewares: Middleware<T, TSpecialNextParam>[]): this
    public useMiddleware(...middlewares: Middleware<T, TSpecialNextParam>[]): this
    public useMiddleware(route: string | UriTemplate | Middleware<T, TSpecialNextParam>, ...middlewares: Middleware<T, TSpecialNextParam>[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRoute<T, TSpecialNextParam>(route);
            routed.useMiddleware(...middlewares);
            super.useMiddleware(routed);
        }
        else
            super.useMiddleware(route, ...middlewares);
        return this;
    }

    /**
     * Uses middleware.
     * @param {string | UriTemplate} route - The route.
     * @param {...((...args: T) => unknown)} middlewares - The middlewares.
     * @returns {this} The router instance.
     */
    public use(route: string | UriTemplate, ...middlewares: ((...args: T) => unknown)[]): this
    public use(...middlewares: ((...args: T) => unknown)[]): this
    public use(route: string | UriTemplate | ((...args: T) => unknown), ...middlewares: ((...args: T) => unknown)[]): this
    {
        if (typeof route === 'string' || Array.isArray(route))
        {
            const routed = new MiddlewareRoute<T, TSpecialNextParam>(route);
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
