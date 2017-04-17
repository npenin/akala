/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Module dependencies.
 * @private
 */
var debug = require('debug')('router');
const flatten = require("array-flatten");
const layer_1 = require("./layer");
exports.Layer = layer_1.Layer;
// import * as methods from 'methods';
const mixin = require("utils-merge");
const parseUrl = require("parseurl");
const route_1 = require("./route");
exports.Route = route_1.Route;
var slice = Array.prototype.slice;
/* istanbul ignore next */
var defer = typeof setImmediate === 'function'
    ? setImmediate
    : function (fn, ...args) { process.nextTick(fn.bind.apply(fn, arguments)); };
class Router {
    constructor(options) {
        this.params = {};
        this.stack = [];
        this.router = this.handle.bind(this);
        var opts = options || {};
        this.caseSensitive = opts.caseSensitive;
        this.mergeParams = opts.mergeParams;
        this.strict = opts.strict;
        this.length = opts.length || 2;
    }
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
    param(name, fn) {
        if (!name) {
            throw new TypeError('argument name is required');
        }
        if (typeof name !== 'string') {
            throw new TypeError('argument name must be a string');
        }
        if (!fn) {
            throw new TypeError('argument fn is required');
        }
        if (typeof fn !== 'function') {
            throw new TypeError('argument fn must be a function');
        }
        var params = this.params[name];
        if (!params) {
            params = this.params[name] = [];
        }
        params.push(fn);
        return this;
    }
    /**
     * Dispatch a req, res into the router.
     *
     * @private
     */
    handle(req, ...rest) {
        return this.internalHandle.apply(this, [{}, req].concat(rest));
    }
    internalHandle(options, req, ...rest) {
        var callback = rest[rest.length - 1];
        if (!callback) {
            throw new TypeError('argument callback is required');
        }
        debug('dispatching %s %s', req['method'] || '', req.url);
        var idx = 0;
        var removed = '';
        var self = this;
        var slashAdded = false;
        var paramcalled = {};
        // middleware and routes
        var stack = this.stack;
        // manage inter-router variables
        var parentParams = req.params;
        var parentUrl = req.baseUrl || '';
        debugger;
        var done = Router.restore(callback, req, 'baseUrl', 'next', 'params');
        // setup next layer
        req.next = next;
        if (options && options.preHandle) {
            done = options.preHandle(done);
        }
        // setup basic req values
        req.baseUrl = parentUrl;
        req.originalUrl = req.originalUrl || req.url;
        next();
        function next(err) {
            var layerError = err === 'route'
                ? null
                : err;
            // remove added slash
            if (slashAdded) {
                req.url = req.url.substr(1);
                slashAdded = false;
            }
            // restore altered req.url
            if (removed.length !== 0) {
                req.baseUrl = parentUrl;
                req.url = removed + req.url;
                removed = '';
            }
            // signal to exit router
            if (layerError === 'router') {
                defer(done, null);
                return;
            }
            // no more matching layers
            if (idx >= stack.length) {
                defer(done, layerError);
                return;
            }
            // get pathname of request
            var path = Router.getPathname(req);
            if (path == null) {
                return done(layerError);
            }
            // find next matching layer
            var layer;
            var match;
            var route;
            while (match !== true && idx < stack.length) {
                layer = stack[idx++];
                match = Router.matchLayer(layer, path);
                route = layer.route;
                if (typeof match !== 'boolean') {
                    // hold on to layerError
                    layerError = layerError || match;
                }
                if (match !== true) {
                    continue;
                }
                if (!route) {
                    // process non-route handlers normally
                    continue;
                }
                if (layerError) {
                    // routes do not match with a pending error
                    match = false;
                    continue;
                }
                var isApplicable = route.isApplicable(req);
                // build up automatic options response
                if (!isApplicable) {
                    if (options && options.notApplicableRoute) {
                        if (options.notApplicableRoute(route) === false) {
                            match = false;
                            continue;
                        }
                    }
                }
            }
            // no match
            if (match !== true) {
                return done(layerError);
            }
            // store route for dispatch on change
            if (route) {
                req.route = route;
            }
            // Capture one-time layer values
            req.params = self.mergeParams
                ? Router.mergeParams(layer.params, parentParams)
                : layer.params;
            var layerPath = layer.path;
            var args = [req];
            args = args.concat(rest.slice(0, rest.length - 1));
            // this should be done for the layer
            self.process_params.apply(self, [layer, paramcalled].concat(args).concat(function (err) {
                if (err) {
                    return next(layerError || err);
                }
                if (route) {
                    return layer.handle_request.apply(layer, args.concat(next));
                }
                trim_prefix(layer, layerError, layerPath, path);
            }));
        }
        function trim_prefix(layer, layerError, layerPath, path) {
            if (layerPath.length !== 0) {
                // Validate path breaks on a path separator
                var c = path[layerPath.length];
                if (c && c !== '/') {
                    next(layerError);
                    return;
                }
                // Trim off the part of the url that matches the route
                // middleware (.use stuff) needs to have the path stripped
                debug('trim prefix (%s) from url %s', layerPath, req.url);
                removed = layerPath;
                req.url = req.url.substr(removed.length);
                // Ensure leading slash
                if (req.url[0] !== '/') {
                    req.url = '/' + req.url;
                    slashAdded = true;
                }
                // Setup base URL (no trailing slash)
                req.baseUrl = parentUrl + (removed[removed.length - 1] === '/'
                    ? removed.substring(0, removed.length - 1)
                    : removed);
            }
            debug('%s %s : %s', layer.name, layerPath, req.originalUrl);
            var args = [req].concat(rest.slice(0, rest.length - 1));
            args.push(next);
            if (layerError) {
                layer.handle_error.apply(layer, [layerError].concat(args));
            }
            else {
                layer.handle_request.apply(layer, args);
            }
        }
    }
    process_params(layer, called, req, ...rest) {
        var done = rest[rest.length - 1];
        var params = this.params;
        // captured parameters from the layer, keys and values
        var keys = layer.keys;
        // fast track
        if (!keys || keys.length === 0) {
            return done();
        }
        var i = 0;
        var name;
        var paramIndex = 0;
        var key;
        var paramVal;
        var paramCallbacks;
        var paramCalled;
        // process params in order
        // param callbacks can be async
        function param(err) {
            if (err) {
                return done(err);
            }
            if (i >= keys.length) {
                return done();
            }
            paramIndex = 0;
            key = keys[i++];
            name = key.name;
            paramVal = req.params[name];
            paramCallbacks = params[name];
            paramCalled = called[name];
            if (paramVal === undefined || !paramCallbacks) {
                return param();
            }
            // param previously called with same value or error occurred
            if (paramCalled && (paramCalled.match === paramVal
                || (paramCalled.error && paramCalled.error !== 'route'))) {
                // restore value
                req.params[name] = paramCalled.value;
                // next param
                return param(paramCalled.error);
            }
            called[name] = paramCalled = {
                error: null,
                match: paramVal,
                value: paramVal
            };
            paramCallback();
        }
        // single param callbacks
        function paramCallback(err) {
            var fn = paramCallbacks[paramIndex++];
            // store updated value
            paramCalled.value = req.params[key.name];
            if (err) {
                // store error
                paramCalled.error = err;
                param(err);
                return;
            }
            if (!fn)
                return param();
            try {
                fn([req].concat(rest.slice(0, rest.length - 1)), paramCallback, paramVal, key.name);
            }
            catch (e) {
                paramCallback(e);
            }
        }
        param();
    }
    use(arg, ...handlers) {
        var offset = 0;
        var path = '/';
        // default path to '/'
        // disambiguate router.use([handler])
        if (typeof arg !== 'function') {
            while (Array.isArray(arg) && arg.length !== 0) {
                arg = arg[0];
            }
            // first arg is the path
            if (typeof arg !== 'function') {
                offset = 1;
                path = arg;
            }
        }
        var callbacks = flatten(slice.call(arguments, offset));
        if (callbacks.length === 0) {
            throw new TypeError('argument handler is required');
        }
        for (var i = 0; i < callbacks.length; i++) {
            var fn = callbacks[i];
            if (typeof fn !== 'function') {
                throw new TypeError('argument handler must be a function');
            }
            // add the middleware
            debug('use %o %s', path, fn.name || '<anonymous>');
            var layer = this.buildLayer(path, {
                sensitive: this.caseSensitive,
                strict: false,
                end: false,
                length: this.length
            }, fn);
            layer.route = undefined;
            this.stack.push(layer);
        }
        return this;
    }
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
    route(path) {
        var route = this.buildRoute(path);
        var layer = this.buildLayer(path, {
            sensitive: this.caseSensitive,
            strict: this.strict,
            end: true,
            length: this.length
        }, route.dispatch.bind(route));
        layer.route = route;
        this.stack.push(layer);
        return route;
    }
    /**
     * Get pathname of request.
     *
     * @param {IncomingMessage} req
     * @private
     */
    static getPathname(req) {
        try {
            return parseUrl(req).pathname;
        }
        catch (err) {
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
    static matchLayer(layer, path) {
        try {
            return layer.match(path);
        }
        catch (err) {
            return err;
        }
    }
    /**
     * Merge params with parent params
     *
     * @private
     */
    static mergeParams(params, parent) {
        if (typeof parent !== 'object' || !parent) {
            return params;
        }
        // make copy of parent for base
        var obj = mixin({}, parent);
        // simple non-numeric merging
        if (!(0 in params) || !(0 in parent)) {
            return mixin(obj, params);
        }
        var i = 0;
        var o = 0;
        // determine numeric gap in params
        while (i in params) {
            i++;
        }
        // determine numeric gap in parent
        while (o in parent) {
            o++;
        }
        // offset numeric indices in params before merge
        for (i--; i >= 0; i--) {
            params[i + o] = params[i];
            // create holes for the merge when necessary
            if (i < o) {
                delete params[i];
            }
        }
        return mixin(obj, params);
    }
    static restore(fn, obj, ...props) {
        var vals = new Array(arguments.length - 2);
        for (var i = 0; i < props.length; i++) {
            vals[i] = obj[props[i]];
        }
        return function (...args) {
            // restore vals
            for (var i = 0; i < props.length; i++) {
                obj[props[i]] = vals[i];
            }
            return fn.apply(this, arguments);
        };
    }
    static wrap(old, fn) {
        return function proxy() {
            var args = new Array(arguments.length + 1);
            args[0] = old;
            for (var i = 0, len = arguments.length; i < len; i++) {
                args[i + 1] = arguments[i];
            }
            fn.apply(this, args);
        };
    }
}
exports.Router = Router;
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
//# sourceMappingURL=index.js.map