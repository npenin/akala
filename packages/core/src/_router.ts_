import * as async from './eachAsync';
import * as router from 'routington';
import { Parser } from "./parser";

export interface routington<T extends Function>
{
    define(path: string): Node<T>[];
    match(path: string): Match<T>;
}

export interface Node<T extends Function>
{
    middleware: Middleware<T>;
    parent: Node<T>;
    children: Node<T>[];
    child: { [key: string]: Node<T> }
}

export interface Match<T extends Function>
{
    node: Node<T>;
    param: { [key: string]: string }
}

export class Middleware<T extends Function>
{
    constructor(protected next: async.NextFunction)
    {

    }

    public static handleMessage<T extends Function>(handlers: T[], args: any[], customNext: async.NextFunction)
    {
        async.array(handlers, (handler, i, next) =>
        {
            // forcing next to be the last one
            debugger;
            var handlerArgs = args.slice(0);
            handlerArgs.push(next);

            handlers[i].apply(this, handlerArgs);
        }, customNext);
    }

    private handlers: T[] = [];

    public use(...handlers: T[])
    {
        handlers.forEach((handler) =>
        {
            this.handlers.push(handler);
        })
        return this;
    }

    public handle(...args: any[])
    {
        debugger;
        var next = args[args.length - 1] instanceof Function && args[args.length - 1];
        if (next)
            args = args.slice(0, args.length - 1);
        else
            next = this.next.bind(this);
        Middleware.handleMessage(this.handlers, args, (error?: any) =>
        {
            debugger;
            next.apply(this, [error].concat(args));
        });
    }
}

export class Router<T extends Function>
{
    constructor(protected next: async.NextFunction, private pathExpression: string)
    {
        this.getPath = Parser.parseFunction(pathExpression);
        this.setPath = function (target: any, value: string)
        {
            Parser.getSetter(pathExpression, target).set(value);
        };
    }

    private middleware: Middleware<T>;
    private getPath: (item: any) => string;
    private setPath: (item: any, value: string) => void;
    private router: routington<T> = router();

    public use(path: string, ...handlers: Router<T>[])
    public use(path: string, ...handlers: T[])
    public use(...handlers: T[])
    public use(...handlers: Router<T>[])
    public use(...handlers: (string | Router<T> | T)[])
    {
        var path: string = null;
        var middlewares: Middleware<T>[] = [];
        var node: Node<T>;

        if (handlers.length > 1)
        {
            if (typeof (handlers[0]) == 'string')
            {
                path = <string>handlers[0];
                handlers = handlers.slice(1);
                if (path[path.length - 1] == '/')
                    node = this.router.define(path + ':rest(.*?)')[0];
                else
                    node = this.router.define(path)[0];
                middlewares.push(node.middleware = node.middleware || new Middleware<T>(this.next));

                if (path[path.length - 1] != '/')
                {
                    node = this.router.define(path + '/:rest(.*?)')[0];
                    middlewares.push(node.middleware = node.middleware || new Middleware<T>(this.next));
                }
            }
        }
        if (!node)
            middlewares.push(this.middleware = this.middleware || new Middleware<T>(this.next));

        var self = this;
        handlers.forEach(function (handler)
        {
            if (handler instanceof Router)
                middlewares.forEach(function (middleware)
                {
                    middleware.use(<T><Function>function ()
                    {
                        debugger;
                        var req: { params: any } = arguments[0];
                        var currentPath = self.getPath(req);
                        var next = <Function>arguments[arguments.length - 1];
                        var args = Array.prototype.slice.call(arguments, 0);
                        var params = req.params;
                        args[args.length - 1] = function (error)
                        {
                            self.setPath(req, currentPath);
                            args[args.length - 1] = next;
                            req.params = params;
                            next.apply(null, [error].concat(args));
                        }
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        self.setPath(req, '/' + (req.params && req.params.rest || ''));
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        handler.handle.apply(handler, args);
                    });
                })
            else if (handler instanceof Function)
                middlewares.forEach(function (middleware)
                {
                    middleware.use(<T><Function>function ()
                    {
                        debugger;
                        var req: { params: any } = arguments[0];
                        var currentPath = self.getPath(req);
                        var next = <Function>arguments[arguments.length - 1];
                        var args = Array.prototype.slice.call(arguments, 0);
                        var params = req.params;
                        args[args.length - 1] = function (error)
                        {
                            self.setPath(req, currentPath);
                            args[args.length - 1] = next;
                            req.params = params;
                            next.apply(null, [error].concat(args));
                        }
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        self.setPath(req, '/' + (req.params && req.params.rest || ''));
                        console.log(path);
                        console.log(self.getPath(req));
                        console.log(req.params);
                        handler.apply(this, args);
                    });
                })
            else
                throw new Error('The path can only be specified in first param position');
        })
        return this;
    }

    public route(path: string)
    {
        var node = this.router.define(path)[0];
        node.middleware = node.middleware || new Middleware<T>(this.next);
        var router = new Router<T>(this.next, this.pathExpression);
        node.middleware.use(<T><Function>(() =>
        {
            var path = this.getPath(arguments[0]);
            router.handleRoute.apply(this, arguments);
        }))
    }

    public handle(...args: any[])
    {
        debugger;
        if (args.length == 0)
            throw new Error('At least one parameter is required. The first parameter needs to hold the path property (either directly or indirectly - sub properties) on which to route');

        var subArgs = args.slice(0);
        var next = args[args.length - 1];
        var evalPath = this.getPath;
        var router = this.router;
        var middlewares = [];
        if (this.middleware)
        {
            middlewares.push(this.middleware);
        }
        var match = router.match(evalPath(args[0]));
        if (match && match.node)
        {
            var node = match.node;
            do
            {
                if (node.parent && node.parent.middleware)
                    middlewares.push(node.parent.middleware);
            }
            while (node = node.parent)
            if (match.node.children)
            {
                match.node.children.forEach(function (node)
                {
                    if (node.middleware)
                        middlewares.push(node.middleware)
                });
            }

            if (match.node.middleware)
                middlewares.push(match.node.middleware);
        }
        async.array(middlewares, function (middleware, i, next)
        {
            var subArgs = args.slice(0);
            subArgs[subArgs.length - 1] = function (error)
            {
                if (error)
                    return next.apply(null, [error].concat(args));


                var match = router.match(evalPath(args[0]));
                if (match && match.node && match.node.middleware)
                {
                    args[0].params = match.param;
                    return match.node.middleware.handle.apply(match.node.middleware, args);
                }
                else
                {
                    next.apply(null, [null].concat(args));
                }
            };
            middleware.handle.apply(middleware, subArgs);
        }, function (error)
            {
                next.apply(null, [error].concat(args));
            })
    }

    public handleRoute(...args: any[])
    {
        args.push(this.next.bind(this));
        return this.handle.apply(this, args);
    }
}

export class Router1<T> extends Router<(arg1: T, next: async.NextFunction) => void>
{
    constructor(next: async.NextFunction, pathExpression: string)
    {
        super(next, pathExpression);
    }
}
export class Router2<T, U> extends Router<(arg1: T, arg2: U, next: async.NextFunction) => void>
{
    constructor(next: async.NextFunction, pathExpression: string)
    {
        super(next, pathExpression);
    }
}