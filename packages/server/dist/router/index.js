"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const http = require("http");
const core_1 = require("@akala/core");
const route_1 = require("./route");
const layer_1 = require("./layer");
var debug = require('debug')('akala:router');
var routing = require('routington');
class Router extends core_1.Router {
    constructor(options) {
        super(options);
    }
    buildLayer(path, options, handler) {
        return new layer_1.HttpLayer(path, options, handler);
    }
    buildRoute(path) {
        return new route_1.HttpRoute(path);
    }
}
exports.Router = Router;
class HttpRouter extends Router {
    constructor(options) {
        super(options);
    }
    attachTo(server) {
        var self = this;
        server.on('request', (req, res) => {
            req.ip = req.socket.remoteAddress;
            req.url = url.parse(req.url).pathname;
            if (!res.status)
                res.status = function (status) {
                    res.statusCode = status;
                    return res;
                };
            if (!res.sendStatus)
                res.sendStatus = function (status) {
                    res.status(status).end();
                    return res;
                };
            if (!res.json)
                res.json = function (content) {
                    if (typeof (content) != 'undefined')
                        switch (typeof (content)) {
                            case 'object':
                                content = JSON.stringify(content);
                        }
                    res.write(content);
                    res.end();
                    return res;
                };
            self.handle(req, res, function () { console.error('deadend'); });
        });
    }
    handle(req, res, ...rest) {
        var methods;
        return this.internalHandle.apply(this, [{
                preHandle: function (done) {
                    if (req.method === 'OPTIONS') {
                        methods = [];
                        done = Router.wrap(done, HttpRouter.generateOptionsResponder(res, methods));
                    }
                    return done;
                },
                notApplicableRoute: function (route) {
                    var method = req.method;
                    // build up automatic options response
                    if (method === 'OPTIONS' && methods) {
                        methods.push.apply(methods, route._methods());
                    }
                    // don't even bother matching route
                    if (method !== 'HEAD') {
                        return false;
                    }
                }
            }, req, res].concat(rest));
    }
    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    static generateOptionsResponder(res, methods) {
        return function onDone(fn, err) {
            if (err || methods.length === 0) {
                return fn(err);
            }
            HttpRouter.trySendOptionsResponse(res, methods, fn);
        };
    }
    static trySendOptionsResponse(res, methods, next) {
        try {
            HttpRouter.sendOptionsResponse(res, methods);
        }
        catch (err) {
            next(err);
        }
    }
    static sendOptionsResponse(res, methods) {
        var options = Object.create(null);
        // build unique method map
        for (var i = 0; i < methods.length; i++) {
            options[methods[i]] = true;
        }
        // construct the allow list
        var allow = Object.keys(options).sort().join(', ');
        // send response
        res.setHeader('Allow', allow);
        res.setHeader('Content-Length', Buffer.byteLength(allow));
        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.end(allow);
    }
}
exports.HttpRouter = HttpRouter;
class WorkerRouter extends Router {
    constructor(options) {
        var opts = options || {};
        opts.length = opts.length || 1;
        super(options);
    }
    handle(req, callback) {
        var methods;
        var args = [{
                preHandle: function (done) {
                    if (req.method === 'OPTIONS') {
                        methods = [];
                        done = Router.wrap(done, WorkerRouter.generateOptionsResponder(callback, methods));
                    }
                    return done;
                },
                notApplicableRoute: function (route) {
                    var method = req.method;
                    // build up automatic options response
                    if (method === 'OPTIONS' && methods) {
                        methods.push.apply(methods, route._methods());
                    }
                    // don't even bother matching route
                    if (method !== 'HEAD') {
                        return false;
                    }
                }
            }, req];
        return this.internalHandle.apply(this, args.concat(callback));
    }
    /**
     * Generate a callback that will make an OPTIONS response.
     *
     * @param {OutgoingMessage} res
     * @param {array} methods
     * @private
     */
    static generateOptionsResponder(res, methods) {
        return function onDone(fn, err) {
            if (err || methods.length === 0) {
                return fn(err);
            }
            WorkerRouter.trySendOptionsResponse(res, methods, fn);
        };
    }
    static trySendOptionsResponse(res, methods, next) {
        try {
            WorkerRouter.sendOptionsResponse(res, methods);
        }
        catch (err) {
            next(err);
        }
    }
    static sendOptionsResponse(res, methods) {
        var options = Object.create(null);
        // build unique method map
        for (var i = 0; i < methods.length; i++) {
            options[methods[i]] = true;
        }
        // construct the allow list
        var allow = Object.keys(options).sort().join(', ');
        // send response
        res({
            headers: {
                'Allow': allow,
                'Content-Length': Buffer.byteLength(allow),
                'Content-Type': 'text/plain',
                'X-Content-Type-Options': 'nosniff'
            }
        }, allow);
    }
}
exports.WorkerRouter = WorkerRouter;
function router(options) {
    return new HttpRouter(options);
}
exports.router = router;
function wrouter(options) {
    return new WorkerRouter(options);
}
exports.wrouter = wrouter;
// create Router#VERB functions
http.METHODS.concat('ALL').forEach(function (method) {
    method = method.toLowerCase();
    Router.prototype[method] = function (path, ...rest) {
        var route = this.route(path);
        route[method].apply(route, rest);
        return this;
    };
});
//# sourceMappingURL=index.js.map