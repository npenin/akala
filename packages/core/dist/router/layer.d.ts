/*!
 * router
 * Copyright(c) 2013 Roman Shtylman
 * Copyright(c) 2014 Douglas Christopher Wilson
 * MIT Licensed
 */
import { Route } from './route';
export interface LayerRegExp extends RegExp {
    fast_star: boolean;
    fast_slash: boolean;
}
export interface LayerOptions {
    end?: boolean;
    sensitive?: boolean;
    mergeParams?: boolean;
    strict?: boolean;
    length: number;
}
/**
 * Expose `Layer`.
 */
export declare class Layer<T extends Function> {
    private handler;
    name: string;
    params: any;
    path: string;
    private regexp;
    keys: any[];
    private isErrorHandler;
    private isRequestHandler;
    constructor(path: string, options: LayerOptions, fn: T);
    isApplicable<TRoute extends Route<T, this>>(req: any, route: TRoute): boolean;
    handle_error(error: any, ...args: any[]): void;
    handle_request(...args: any[]): void;
    /**
     * Check if this route matches `path`, if so
     * populate `.params`.
     *
     * @param {String} path
     * @return {Boolean}
     * @api private
     */
    match(path: string): boolean;
}
