/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */


/**
 * Module dependencies.
 * @private
 */

var debug = require('debug')('router')
import { Layer, LayerOptions } from './layer';
// import * as methods from 'methods';
import { extend } from '../helpers';
import { parse as parseUrl } from 'url';
import { Route, IRoutable } from './route';
import * as http from 'http'
export { Layer, Route, LayerOptions, IRoutable };

export type RoutableLayer<T extends Function> = Layer<T> & IRoutable<T>;

var slice = Array.prototype.slice

/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
    ? setImmediate
    : function (fn, ...args) { process.nextTick(fn.bind.apply(fn, arguments)) }

export interface RouterOptions
{
    caseSensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;
    length?: number;
    separator?: string;
    name?: string;
}

export interface NextParamCallback
{
    (error): void;
    (): void | any;
}

export type ParamCallback = (req, paramCallback: NextParamCallback, paramVal: any, name: string, ...rest) => void;

export interface Request
{
    next?: NextFunction;
    baseUrl?: string;
    url?: string;
    params?: { [key: string]: any };
    originalUrl?: string;
    route?: Route<any, Layer<any>>
}

export interface NextFunction
{
    (arg: 'router'): void;
    (arg: 'route'): void;
    (err: any): void;
    (): void;
}

export type Middleware1<T extends Request> = (req: T, next: NextFunction) => void;
export type Middleware2<T extends Request, U> = (req: T, res: U, next: NextFunction) => void;
export type ErrorMiddleware1<T extends Request> = (error: any, req: T, next: NextFunction) => void;
export type ErrorMiddleware2<T extends Request, U> = (error: any, req: T, res: U, next: NextFunction) => void;

export type Middleware1Extended<T extends Request> = Middleware1<T> | ErrorMiddleware1<T>;
export type Middleware2Extended<T extends Request, U> = Middleware2<T, U> | ErrorMiddleware2<T, U>;

export abstract class Router<T extends (Middleware1<any> | Middleware2<any, any>), U extends (ErrorMiddleware1<any> | ErrorMiddleware2<any, any>), TLayer extends (Layer<T> & IRoutable<T>), TRoute extends Route<T, TLayer>>
{
    constructor(options?: RouterOptions)
    {
        var opts = options || {}

        this.caseSensitive = opts.caseSensitive
        this.mergeParams = opts.mergeParams;
        this.separator = opts.separator || '/';
        this.strict = opts.strict
        this.length = opts.length || 2;
        this.name = opts.name;
    }

    public readonly name: string;
    private separator: string;
    private length: number;
    private caseSensitive: boolean;
    private mergeParams: boolean;
    private params: { [param: string]: ParamCallback[] } = {}
    private strict: boolean;
    private stack = []

    public readonly router = this.handle.bind(this);

    /**
     * Map the given param placeholder `name`(s) to the given callback.
     *
     * Parameter mapping is used to provide pre-conditions to routes
     * which use normalized placeholders. For example a _:user_id_ parameter
     * could automatically load a user's information from the database without
     * any additional code.
     *
     * The callback uses the same signature as middleware, the only difference
     * being that the value of the placeholder is passed, in this case the _id_
     * of the user. Once the `next()` function is invoked, just like middleware
     * it will continue on to execute the route, or subsequent parameter functions.
     *
     * Just like in middleware, you must either respond to the request or call next
     * to avoid stalling the request.
     *
     *  router.param('user_id', function(req, res, next, id){
     *    User.find(id, function(err, user){
     *      if (err) {
     *        return next(err)
     *      } else if (!user) {
     *        return next(new Error('failed to load user'))
     *      }
     *      req.user = user
     *      next()
     *    })
     *  })
     *
     * @param {string} name
     * @param {function} fn
     * @public
     */

    public param(name: string, fn: ParamCallback)
    {
        if (!name)
        {
            throw new TypeError('argument name is required')
        }

        if (typeof name !== 'string')
        {
            throw new TypeError('argument name must be a string')
        }

        if (!fn)
        {
            throw new TypeError('argument fn is required')
        }

        if (typeof fn !== 'function')
        {
            throw new TypeError('argument fn must be a function')
        }

        var params = this.params[name]

        if (!params)
        {
            params = this.params[name] = []
        }

        params.push(fn)

        return this
    }

    /**
     * Dispatch a req, res into the router.
     *
     * @private
     */

    public handle<TRequest extends Request>(req: TRequest, ...rest)
    {
        return this.internalHandle.call(this, {}, req, ...rest);
    }

    protected internalHandle(options, req, ...rest)
    {
        var callback = rest[rest.length - 1];
        if (options && !options.ensureCleanStart)
        {
            options.ensureCleanStart = function ()
            {
                if (req.url[0] !== separator)
                {
                    req.url = separator + req.url
                    slashAdded = true
                }
            };
        }
        if (!callback)
        {
            throw new TypeError('argument callback is required')
        }

        debug('dispatching %s %s', req['method'] || '', req.url)
        // debug(this.stack);

        var idx = 0
        var removed = ''
        var self = this
        var slashAdded = false
        var paramcalled = {};
        var separator = this.separator;

        // middleware and routes
        var stack = this.stack

        // manage inter-router variables
        var parentParams = req.params
        var parentUrl: string = req.baseUrl || '';
        var done = Router.restore(callback, req, 'baseUrl', 'next', 'params')

        // setup next layer
        req.next = next

        if (options && options.preHandle)
        {
            done = options.preHandle(done);
        }

        // setup basic req values
        req.baseUrl = parentUrl
        req.originalUrl = req.originalUrl || req.url

        next()

        function next(err?)
        {
            var layerError = err === 'route'
                ? null
                : err

            // remove added slash
            if (slashAdded && req.url)
            {
                req.url = req.url.substr(1)
                slashAdded = false
            }

            // restore altered req.url
            if (removed.length !== 0)
            {
                self.unshift(req, removed, parentUrl);
                removed = '';
            }

            // signal to exit router
            if (layerError === 'router')
            {
                defer(done, null)
                return
            }

            // no more matching layers
            if (idx >= stack.length)
            {
                defer(done, layerError)
                return
            }

            // get pathname of request
            var path = self.getPathname(req)

            if (path == null)
            {
                return done(layerError)
            }

            // find next matching layer
            var layer: TLayer;
            var match: boolean;
            var route: TRoute

            while (match !== true && idx < stack.length)
            {
                layer = stack[idx++]
                match = Router.matchLayer(layer, path)
                route = <TRoute>layer.route

                if (typeof match !== 'boolean')
                {
                    // hold on to layerError
                    layerError = layerError || match
                }

                if (match !== true)
                {
                    continue
                }

                if (!route)
                {
                    // process non-route handlers normally
                    continue
                }

                if (layerError)
                {
                    // routes do not match with a pending error
                    match = false
                    continue
                }

                var isApplicable = route.isApplicable(req)

                // build up automatic options response
                if (!isApplicable)
                {
                    if (options && options.notApplicableRoute)
                    {
                        if (options.notApplicableRoute(route) === false)
                        {
                            match = false
                            continue
                        }
                    }
                }
            }

            // no match
            if (match !== true)
            {
                return done(layerError)
            }

            // store route for dispatch on change
            if (route)
            {
                req.route = route
            }

            // Capture one-time layer values
            req.params = self.mergeParams
                ? Router.mergeParams(layer.params, parentParams)
                : layer.params
            var layerPath = layer.path

            var args: any[] = [req];
            args = args.concat(rest.slice(0, rest.length - 1));

            // this should be done for the layer
            self.process_params(layer, paramcalled, req, ...args, function (err)
            {
                if (err)
                {
                    return next(layerError || err)
                }

                if (route)
                {
                    return layer.handle_request.apply(layer, args.concat(next));
                }

                trim_prefix(layer, layerError, layerPath, path)
            });
        }


        function trim_prefix(layer: TLayer, layerError, layerPath: string, path: string)
        {
            if (layerPath.length !== 0)
            {
                // Validate path breaks on a path separator
                var c = path[layerPath.length]
                if (c && c !== separator)
                {
                    next(layerError)
                    return
                }

                // Trim off the part of the url that matches the route
                // middleware (.use stuff) needs to have the path stripped
                debug('trim prefix (%s) from url %s', layerPath, req.url)
                removed = layerPath
                self.shift(req, removed);

                // Ensure leading slash
                options.ensureCleanStart(req);

                // Setup base URL (no trailing slash)
                req.baseUrl = parentUrl + (removed[removed.length - 1] === separator
                    ? removed.substring(0, removed.length - 1)
                    : removed)
            }

            debug('%s %s : %s', layer.name, layerPath, req.originalUrl)

            var args: any[] = [req].concat(rest.slice(0, rest.length - 1));
            args.push(next);
            if (layerError)
            {
                layer.handle_error.apply(layer, [layerError].concat(args))
            } else
            {
                layer.handle_request.apply(layer, args);
            }
        }
    }

    protected shift(req, removed)
    {
        req.url = req.url.substring(removed.length);
    }

    protected unshift(req, removed, parentUrl)
    {
        req.baseUrl = parentUrl;
        req.url = removed + req.url;
    }

    public process_params(layer: TLayer, called, req, ...rest)
    {
        var done = rest[rest.length - 1];
        var params = this.params
        // captured parameters from the layer, keys and values
        var keys = layer.keys

        // fast track
        if (!keys || keys.length === 0)
        {
            return done()
        }

        var i = 0
        var name
        var paramIndex = 0
        var key
        var paramVal
        var paramCallbacks: ParamCallback[];
        var paramCalled: {
            error: any,
            match: any,
            value: any
        };

        // process params in order
        // param callbacks can be async
        function param(err?)
        {
            if (err)
            {
                return done(err)
            }

            if (i >= keys.length)
            {
                return done()
            }

            paramIndex = 0
            key = keys[i++]
            name = key.name
            paramVal = req.params[name]
            paramCallbacks = params[name]
            paramCalled = called[name]

            if (paramVal === undefined || !paramCallbacks)
            {
                return param()
            }

            // param previously called with same value or error occurred
            if (paramCalled && (paramCalled.match === paramVal
                || (paramCalled.error && paramCalled.error !== 'route')))
            {
                // restore value
                req.params[name] = paramCalled.value

                // next param
                return param(paramCalled.error)
            }

            called[name] = paramCalled = {
                error: null,
                match: paramVal,
                value: paramVal
            }

            paramCallback()
        }

        // single param callbacks
        function paramCallback(err?)
        {
            var fn = paramCallbacks[paramIndex++]

            // store updated value
            paramCalled.value = req.params[key.name]

            if (err)
            {
                // store error
                paramCalled.error = err
                param(err)
                return
            }

            if (!fn)
                return param()

            try
            {
                fn(req, paramCallback, paramVal, key.name, rest.slice(0, rest.length - 1));
            } catch (e)
            {
                paramCallback(e)
            }
        }

        param()
    }

    /**
     * Use the given middleware function, with optional path, defaulting to "/".
     *
     * Use (like `.all`) will run for any http METHOD, but it will not add
     * handlers for those methods so OPTIONS requests will not consider `.use`
     * functions even if they could respond.
     *
     * The other difference is that _route_ path is stripped and not visible
     * to the handler function. The main effect of this feature is that mounted
     * handlers can operate without any code changes regardless of the "prefix"
     * pathname.
     *
     * @public
     */
    public use(...handlers: (T | U)[])
    public use(path: string, ...handlers: (T | U)[])
    public use(...handlers: (string | T | U)[])
    {
        var offset = 0
        var path = this.separator;

        // default path to *separator*
        // disambiguate router.use([handler])
        if (typeof handlers[0] !== 'function')
        {
            // first arg is the path
            if (typeof handlers[0] == 'string')
            {
                offset = 1
                path = <string>handlers.shift();
            }
        }

        var callbacks = handlers as Array<T | U>

        if (callbacks.length === 0)
        {
            throw new TypeError('argument handler is required')
        }

        for (var i = 0; i < callbacks.length; i++)
        {
            this.layer(path, callbacks[i]);
        }

        return this
    }

    protected layer(path: string, fn: T | U)
    {
        if (typeof fn !== 'function')
        {
            throw new TypeError('argument handler must be a function')
        }

        // add the middleware
        debug('use %o %s', path, fn.name || '<anonymous>')

        var layer = this.buildLayer(path, {
            sensitive: this.caseSensitive,
            strict: false,
            end: false,
            length: this.length
        }, fn)

        layer.route = undefined

        this.stack.push(layer)

        return layer;
    }

    protected abstract buildLayer(path: string, options: LayerOptions, handler: T | U): TLayer;
    protected abstract buildRoute(path: string): TRoute;

    /**
     * Create a new Route for the given path.
     *
     * Each route contains a separate middleware stack and VERB handlers.
     *
     * See the Route api documentation for details on adding handlers
     * and middleware to routes.
     *
     * @param {string} path
     * @return {Route}
     * @public
     */
    public route(path: string): TRoute
    {
        var route = this.buildRoute(path)

        var layer = this.buildLayer(path, {
            sensitive: this.caseSensitive,
            strict: this.strict,
            end: true,
            length: this.length
        }, route.dispatch.bind(route) as any)

        layer.route = route

        this.stack.push(layer)
        return route
    }



    /**
     * Get pathname of request.
     *
     * @param {IncomingMessage} req
     * @private
     */
    public getPathname(req: any)
    {
        try
        {
            return parseUrl(req.url).pathname;
        }
        catch (err)
        {
            return undefined;
        }
    }

    /**
     * Match path to a layer.
     *
     * @param {Layer} layer
     * @param {string} path
     * @private
     */
    protected static matchLayer<T extends Function>(layer: Layer<T>, path: string)
    {
        try
        {
            return layer.match(path);
        } catch (err)
        {
            console.error(err);
            return err;
        }
    }

    /**
     * Merge params with parent params
     *
     * @private
     */

    protected static mergeParams(params, parent)
    {
        if (typeof parent !== 'object' || !parent)
        {
            return params
        }

        // make copy of parent for base
        var obj = extend({}, parent)

        // simple non-numeric merging
        if (!(0 in params) || !(0 in parent))
        {
            return extend(obj, params)
        }

        var i = 0
        var o = 0

        // determine numeric gap in params
        while (i in params)
        {
            i++
        }

        // determine numeric gap in parent
        while (o in parent)
        {
            o++
        }

        // offset numeric indices in params before merge
        for (i--; i >= 0; i--)
        {
            params[i + o] = params[i]

            // create holes for the merge when necessary
            if (i < o)
            {
                delete params[i]
            }
        }

        return extend(obj, params)
    }

    protected static restore(fn, obj, ...props: string[])
    {
        var vals = new Array(arguments.length - 2)

        for (var i = 0; i < props.length; i++)
        {
            vals[i] = obj[props[i]]
        }

        return function (...args)
        {
            // restore vals
            for (var i = 0; i < props.length; i++)
            {
                obj[props[i]] = vals[i]
            }

            return fn.apply(this, arguments)
        }
    }
    protected static wrap(old, fn)
    {
        return function proxy()
        {
            var args = new Array(arguments.length + 1)

            args[0] = old
            for (var i = 0, len = arguments.length; i < len; i++)
            {
                args[i + 1] = arguments[i]
            }

            fn.apply(this, args)
        }
    }
}

export abstract class Router1<T extends Request, TLayer extends RoutableLayer<Middleware1<T>>, TRoute extends Route<Middleware1<T>, TLayer>> extends Router<Middleware1<T>, ErrorMiddleware1<T>, TLayer, TRoute>
{
    constructor(options?: RouterOptions)
    {
        super(options);
    }
}
export abstract class Router2<T extends Request, U, TLayer extends RoutableLayer<Middleware2<T, U>>, TRoute extends Route<Middleware2<T, U>, TLayer>> extends Router<Middleware2<T, U>, ErrorMiddleware2<T, U>, TLayer, TRoute>
{
    constructor(options?: RouterOptions)
    {
        super(options);
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