import { Route, Layer, LayerOptions } from '@akala/core';
import { HttpLayer } from './layer';
import { METHODS as methods } from 'http'

export class HttpRoute<T extends Function> extends Route<T, HttpLayer<T>>
{
    public methods: { [key: string]: boolean } = {};
    constructor(public path: string)
    {
        super(path);
    }

    public isApplicable(req: { method: string })
    {
        if (this.methods._all)
        {
            return true
        }

        // normalize name
        var name = req.method.toLowerCase()

        if (name === 'head' && !this.methods['head'])
        {
            name = 'get'
        }

        return Boolean(this.methods[name])
    }

    public _methods()
    {
        var methods = Object.keys(this.methods)

        // append automatic head
        if (this.methods.get && !this.methods.head)
        {
            methods.push('head')
        }

        for (var i = 0; i < methods.length; i++)
        {
            // make upper case
            methods[i] = methods[i].toUpperCase()
        }

        return methods
    }

    public dispatch(req, ...rest)
    {
        var method = req.method.toLowerCase()
        if (method === 'head' && !this.methods['head'])
        {
            method = 'get'
        }

        return super.dispatch.apply(this, [req].concat(rest));
    }

    public buildLayer(path: string, options: LayerOptions, callback: T)
    {
        return new HttpLayer<T>('/', options, callback);
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


    public all(...handlers: T[])
    {
        return this.addHandler((layer: HttpLayer<T>) =>
        {
            this.methods._all = true;
            layer.method = undefined;
            return layer;
        }, handlers);
    }

    public checkout: (...handlers: T[]) => this;
    public connect: (...handlers: T[]) => this;
    public copy: (...handlers: T[]) => this;
    public delete: (...handlers: T[]) => this;
    public get: (...handlers: T[]) => this;
    public head: (...handlers: T[]) => this;
    public lock: (...handlers: T[]) => this;
    public 'm-search': (...handlers: T[]) => this;
    public merge: (...handlers: T[]) => this;
    public mkactivity: (...handlers: T[]) => this;
    public mkcalendar: (...handlers: T[]) => this;
    public mkcol: (...handlers: T[]) => this;
    public move: (...handlers: T[]) => this;
    public notify: (...handlers: T[]) => this;
    public options: (...handlers: T[]) => this;
    public patch: (...handlers: T[]) => this;
    public post: (...handlers: T[]) => this;
    public prop: (...handlers: T[]) => this;
    public find: (...handlers: T[]) => this;
    public proppatch: (...handlers: T[]) => this;
    public purge: (...handlers: T[]) => this;
    public put: (...handlers: T[]) => this;
    public report: (...handlers: T[]) => this;
    public search: (...handlers: T[]) => this;
    public subscribe: (...handlers: T[]) => this;
    public trace: (...handlers: T[]) => this;
    public unlock: (...handlers: T[]) => this;
    public unsubscribe: (...handlers: T[]) => this;
}