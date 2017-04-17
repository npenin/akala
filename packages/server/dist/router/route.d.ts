import { Route, LayerOptions } from '@akala/core';
import { HttpLayer } from './layer';
export declare class HttpRoute<T extends Function> extends Route<T, HttpLayer<T>> {
    path: string;
    methods: {
        [key: string]: boolean;
    };
    constructor(path: string);
    isApplicable(req: {
        method: string;
    }): boolean;
    _methods(): string[];
    dispatch(req: any, ...rest: any[]): any;
    buildLayer(path: string, options: LayerOptions, callback: T): HttpLayer<T>;
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
    all(...handlers: T[]): any;
    checkout: (...handlers: T[]) => this;
    connect: (...handlers: T[]) => this;
    copy: (...handlers: T[]) => this;
    delete: (...handlers: T[]) => this;
    get: (...handlers: T[]) => this;
    head: (...handlers: T[]) => this;
    lock: (...handlers: T[]) => this;
    'm-search': (...handlers: T[]) => this;
    merge: (...handlers: T[]) => this;
    mkactivity: (...handlers: T[]) => this;
    mkcalendar: (...handlers: T[]) => this;
    mkcol: (...handlers: T[]) => this;
    move: (...handlers: T[]) => this;
    notify: (...handlers: T[]) => this;
    options: (...handlers: T[]) => this;
    patch: (...handlers: T[]) => this;
    post: (...handlers: T[]) => this;
    prop: (...handlers: T[]) => this;
    find: (...handlers: T[]) => this;
    proppatch: (...handlers: T[]) => this;
    purge: (...handlers: T[]) => this;
    put: (...handlers: T[]) => this;
    report: (...handlers: T[]) => this;
    search: (...handlers: T[]) => this;
    subscribe: (...handlers: T[]) => this;
    trace: (...handlers: T[]) => this;
    unlock: (...handlers: T[]) => this;
    unsubscribe: (...handlers: T[]) => this;
}
