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
const pathRegexp = require("path-to-regexp");
const log = require("debug");
var debug = log('router:layer');
/**
 * Module variables.
 * @private
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;
/**
 * Expose `Layer`.
 */
class Layer {
    constructor(path, options, fn) {
        if (!(this instanceof Layer)) {
            return new Layer(path, options, fn);
        }
        debug('new %o', path);
        var opts = options || { length: 2 };
        this.handle = fn;
        this.name = fn.name || '<anonymous>';
        this.params = undefined;
        this.path = undefined;
        this.regexp = pathRegexp(path, this.keys = [], opts);
        // set fast path flags
        this.regexp.fast_star = path === '*';
        this.regexp.fast_slash = path === '/' && opts.end === false;
        this.length = opts.length || 2;
    }
    isApplicable(req, route) {
        return true;
    }
    handle_error(error, ...args) {
        var fn = this.handle;
        var next = args[args.length - 1];
        if (fn.length !== this.length + 1) {
            // not a standard error handler
            return next(error);
        }
        try {
            fn.apply(null, [error].concat(args));
        }
        catch (err) {
            next(err);
        }
    }
    handle_request(...args) {
        var fn = this.handle;
        var next = args[args.length - 1];
        if (fn.length > this.length + 1) {
            // not a standard request handler
            return next();
        }
        try {
            fn.apply(null, args);
        }
        catch (err) {
            console.error('error occurred');
            console.error(err);
            next(err);
        }
    }
    /**
     * Check if this route matches `path`, if so
     * populate `.params`.
     *
     * @param {String} path
     * @return {Boolean}
     * @api private
     */
    match(path) {
        var match;
        if (path != null) {
            // fast path non-ending match for / (any path matches)
            if (this.regexp.fast_slash) {
                this.params = {};
                this.path = '';
                return true;
            }
            // fast path for * (everything matched in a param)
            if (this.regexp.fast_star) {
                this.params = { '0': decode_param(path) };
                this.path = path;
                return true;
            }
            // match the path
            match = this.regexp.exec(path);
        }
        if (!match) {
            this.params = undefined;
            this.path = undefined;
            return false;
        }
        // store values
        this.params = {};
        this.path = match[0];
        // iterate matches
        var keys = this.keys;
        var params = this.params;
        for (var i = 1; i < match.length; i++) {
            var key = keys[i - 1];
            var prop = key.name;
            var val = decode_param(match[i]);
            if (val !== undefined || !(hasOwnProperty.call(params, prop))) {
                params[prop] = val;
            }
        }
        return true;
    }
}
exports.Layer = Layer;
/**
 * Decode param value.
 *
 * @param {string} val
 * @return {string}
 * @private
 */
function decode_param(val) {
    if (typeof val !== 'string' || val.length === 0) {
        return val;
    }
    try {
        return decodeURIComponent(val);
    }
    catch (err) {
        if (err instanceof URIError) {
            err.message = 'Failed to decode param \'' + val + '\'';
            err['status'] = 400;
        }
        throw err;
    }
}
//# sourceMappingURL=layer.js.map