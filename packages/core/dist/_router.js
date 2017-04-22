"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const async = require("./eachAsync");
const router = require("routington");
const parser_1 = require("./parser");
class Middleware {
    constructor(next) {
        this.next = next;
        this.handlers = [];
    }
    static handleMessage(handlers, args, customNext) {
        async.array(handlers, (handler, i, next) => {
            // forcing next to be the last one
            debugger;
            var handlerArgs = args.slice(0);
            handlerArgs.push(next);
            handlers[i].apply(this, handlerArgs);
        }, customNext);
    }
    use(...handlers) {
        handlers.forEach((handler) => {
            this.handlers.push(handler);
        });
        return this;
    }
    handle(...args) {
        debugger;
        var next = args[args.length - 1] instanceof Function && args[args.length - 1];
        if (next)
            args = args.slice(0, args.length - 1);
        else
            next = this.next.bind(this);
        Middleware.handleMessage(this.handlers, args, (error) => {
            debugger;
            next.apply(this, [error].concat(args));
        });
    }
}
exports.Middleware = Middleware;
class Router {
    constructor(next, pathExpression) {
        this.next = next;
        this.pathExpression = pathExpression;
        this.router = router();
        this.getPath = parser_1.Parser.parseFunction(pathExpression);
        this.setPath = function (target, value) {
            parser_1.Parser.getSetter(pathExpression, target).set(value);
        };
    }
    use(...handlers) {
        var path = null;
        var middlewares = [];
        var node;
        if (handlers.length > 1) {
            if (typeof (handlers[0]) == 'string') {
                path = handlers[0];
                handlers = handlers.slice(1);
                if (path[path.length - 1] == '/')
                    node = this.router.define(path + ':rest(.*?)')[0];
                else
                    node = this.router.define(path)[0];
                middlewares.push(node.middleware = node.middleware || new Middleware(this.next));
                if (path[path.length - 1] != '/') {
                    node = this.router.define(path + '/:rest(.*?)')[0];
                    middlewares.push(node.middleware = node.middleware || new Middleware(this.next));
                }
            }
        }
        if (!node)
            middlewares.push(this.middleware = this.middleware || new Middleware(this.next));
        var self = this;
        handlers.forEach(function (handler) {
            if (handler instanceof Router)
                middlewares.forEach(function (middleware) {
                    middleware.use(function () {
                        debugger;
                        var req = arguments[0];
                        var currentPath = self.getPath(req);
                        var next = arguments[arguments.length - 1];
                        var args = Array.prototype.slice.call(arguments, 0);
                        var params = req.params;
                        args[args.length - 1] = function (error) {
                            self.setPath(req, currentPath);
                            args[args.length - 1] = next;
                            req.params = params;
                            next.apply(null, [error].concat(args));
                        };
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        self.setPath(req, '/' + (req.params && req.params.rest || ''));
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        handler.handle.apply(handler, args);
                    });
                });
            else if (handler instanceof Function)
                middlewares.forEach(function (middleware) {
                    middleware.use(function () {
                        debugger;
                        var req = arguments[0];
                        var currentPath = self.getPath(req);
                        var next = arguments[arguments.length - 1];
                        var args = Array.prototype.slice.call(arguments, 0);
                        var params = req.params;
                        args[args.length - 1] = function (error) {
                            self.setPath(req, currentPath);
                            args[args.length - 1] = next;
                            req.params = params;
                            next.apply(null, [error].concat(args));
                        };
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        self.setPath(req, '/' + (req.params && req.params.rest || ''));
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        handler.apply(this, args);
                    });
                });
            else
                throw new Error('The path can only be specified in first param position');
        });
        return this;
    }
    route(path) {
        var node = this.router.define(path)[0];
        node.middleware = node.middleware || new Middleware(this.next);
        var router = new Router(this.next, this.pathExpression);
        node.middleware.use((() => {
            var path = this.getPath(arguments[0]);
            router.handleRoute.apply(this, arguments);
        }));
    }
    handle(...args) {
        debugger;
        if (args.length == 0)
            throw new Error('At least one parameter is required. The first parameter needs to hold the path property (either directly or indirectly - sub properties) on which to route');
        var subArgs = args.slice(0);
        var next = args[args.length - 1];
        var evalPath = this.getPath;
        var router = this.router;
        var middlewares = [];
        if (this.middleware) {
            middlewares.push(this.middleware);
        }
        var match = router.match(evalPath(args[0]));
        if (match && match.node) {
            var node = match.node;
            do {
                if (node.parent && node.parent.middleware)
                    middlewares.push(node.parent.middleware);
            } while (node = node.parent);
            if (match.node.children) {
                match.node.children.forEach(function (node) {
                    if (node.middleware)
                        middlewares.push(node.middleware);
                });
            }
            if (match.node.middleware)
                middlewares.push(match.node.middleware);
        }
        async.array(middlewares, function (middleware, i, next) {
            var subArgs = args.slice(0);
            subArgs[subArgs.length - 1] = function (error) {
                if (error)
                    return next.apply(null, [error].concat(args));
                var match = router.match(evalPath(args[0]));
                if (match && match.node && match.node.middleware) {
                    args[0].params = match.param;
                    return match.node.middleware.handle.apply(match.node.middleware, args);
                }
                else {
                    next.apply(null, [null].concat(args));
                }
            };
            middleware.handle.apply(middleware, subArgs);
        }, function (error) {
            next.apply(null, [error].concat(args));
        });
    }
    handleRoute(...args) {
        args.push(this.next.bind(this));
        return this.handle.apply(this, args);
    }
}
exports.Router = Router;
class Router1 extends Router {
    constructor(next, pathExpression) {
        super(next, pathExpression);
    }
}
exports.Router1 = Router1;
class Router2 extends Router {
    constructor(next, pathExpression) {
        super(next, pathExpression);
    }
}
exports.Router2 = Router2;
//# sourceMappingURL=_router.js.map