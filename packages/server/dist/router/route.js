"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
const layer_1 = require("./layer");
const http_1 = require("http");
class HttpRoute extends core_1.Route {
    constructor(path) {
        super(path);
        this.path = path;
        this.methods = {};
    }
    isApplicable(req) {
        if (this.methods._all) {
            return true;
        }
        // normalize name
        var name = req.method.toLowerCase();
        if (name === 'head' && !this.methods['head']) {
            name = 'get';
        }
        return Boolean(this.methods[name]);
    }
    _methods() {
        var methods = Object.keys(this.methods);
        // append automatic head
        if (this.methods.get && !this.methods.head) {
            methods.push('head');
        }
        for (var i = 0; i < methods.length; i++) {
            // make upper case
            methods[i] = methods[i].toUpperCase();
        }
        return methods;
    }
    dispatch(req, ...rest) {
        var method = req.method.toLowerCase();
        if (method === 'head' && !this.methods['head']) {
            method = 'get';
        }
        return super.dispatch.apply(this, [req].concat(rest));
    }
    buildLayer(path, options, callback) {
        return new layer_1.HttpLayer('/', options, callback);
    }
    /**
     * Add a handler for all HTTP verbs to this route.
     *
     * Behaves just like middleware and can respond or call `next`
     * to continue processing.
     *
     * You can use multiple `.all` call to add multiple handlers.
     *
     *   function check_something(req, res, next){
     *     next()
     *   }
     *
     *   function validate_user(req, res, next){
     *     next()
     *   }
     *
     *   route
     *   .all(validate_user)
     *   .all(check_something)
     *   .get(function(req, res, next){
     *     res.send('hello world')
     *   })
     *
     * @param {array|function} handler
     * @return {Route} for chaining
     * @api public
     */
    all(...handlers) {
        return this.addHandler((layer) => {
            this.methods._all = true;
            layer.method = undefined;
            return layer;
        }, handlers);
    }
}
exports.HttpRoute = HttpRoute;
http_1.METHODS.forEach(function (method) {
    method = method.toLowerCase();
    HttpRoute.prototype[method] = function (...handlers) {
        return this.addHandler((layer) => {
            layer.method = method;
            this.methods[method] = true;
            return layer;
        }, handlers);
    };
});
//# sourceMappingURL=route.js.map