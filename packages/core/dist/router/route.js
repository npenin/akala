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
var debug = require('debug')('router:route');
var flatten = require('array-flatten');
const layer_1 = require("./layer");
/**
 * Module variables.
 * @private
 */
var slice = Array.prototype.slice;
/**
 * Expose `Route`.
 */
class Route {
    constructor(path) {
        this.path = path;
        this.stack = [];
        debug('new %o', path);
    }
    dispatch(req, ...rest) {
        var done = arguments[arguments.length - 1];
        var idx = 0;
        var stack = this.stack;
        if (stack.length === 0) {
            return done();
        }
        req.route = this;
        var args = slice.call(arguments, 0);
        args[args.length - 1] = next;
        next();
        function next(err) {
            // signal to exit route
            if (err && err === 'route')
                return done();
            // signal to exit router
            if (err && err === 'router')
                return done(err);
            // no more matching layers
            if (idx >= stack.length)
                return done(err);
            var layer;
            var match;
            // find next matching layer
            while (match !== true && idx < stack.length) {
                layer = stack[idx++];
                match = layer.isApplicable(req, this);
            }
            // no match
            if (match !== true)
                return done(err);
            if (err)
                layer.handle_error.apply(layer, [err].concat(args));
            else
                layer.handle_request.apply(layer, args);
        }
    }
    buildLayer(path, options, callback) {
        return new layer_1.Layer('/', options, callback);
    }
    isApplicable(req) {
        return true;
    }
    addHandler(postBuildLayer, ...handlers) {
        var callbacks = flatten(handlers);
        if (callbacks.length === 0) {
            throw new TypeError('argument handler is required');
        }
        for (var i = 0; i < callbacks.length; i++) {
            var fn = callbacks[i];
            if (typeof fn !== 'function') {
                throw new TypeError('argument handler must be a function');
            }
            var layer = postBuildLayer(this.buildLayer('/', { length: fn.length - 1 }, fn));
            this.stack.push(layer);
        }
        return this;
    }
}
exports.Route = Route;
//# sourceMappingURL=route.js.map