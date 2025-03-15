import { isPromiseLike } from "../promiseHelpers.js";

/* A middleware promise is the opposite of a promise which will fail when there is a result 
 * and which will succeed as long as there is no middleware that handled the context
 */
export type MiddlewarePromise<T extends string | void = SpecialNextParam> = Promise<MiddlewareResult<T>>;
export type MiddlewareResult<T extends string | void = SpecialNextParam> = Error | T | OptionsResponse;

export interface Middleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
{
    handle(...context: T): MiddlewareResult<TSpecialNextParam>;
}

export interface ErrorMiddleware<T extends unknown[], U extends string | void = SpecialNextParam> 
{
    handleError(error: Error | OptionsResponse, ...context: T): MiddlewareResult<U>;
}

export interface MiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
{
    handle(...context: T): Promise<MiddlewareResult<TSpecialNextParam>>;
}

export interface ErrorMiddlewareAsync<T extends unknown[], U extends string | void = SpecialNextParam> 
{
    handleError(error: Error | OptionsResponse, ...context: T): Promise<MiddlewareResult<U>>;
}

export type AnyAsyncMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> =
    MiddlewareAsync<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
    ;

export type AnySyncMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> =
    Middleware<T, TSpecialNextParam> | ErrorMiddleware<T, TSpecialNextParam>
    ;
export type AnyMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> =
    AnyAsyncMiddleware<T, TSpecialNextParam> | AnySyncMiddleware<T, TSpecialNextParam>
    ;

export type OptionsResponse = { allow: string[] };

export type MiddlewareError<T = unknown> = { error: T };
export type MiddlewareSuccess<T = unknown> = { success: T | Promise<T> };
export type SpecialNextParam = 'break' | void;

/**
 * Converts a function to a middleware.
 * @param {Function} fn - The function to convert.
 * @returns {Function} The middleware function.
 */
export function toMiddleware<T extends unknown[], U extends string | void>(fn: (...args: T) => unknown): Middleware<T, U>['handle']
export function toMiddleware<T extends unknown[], U extends string | void>(fn: (...args: T) => Promise<unknown>): MiddlewareAsync<T, U>['handle']
export function toMiddleware<T extends unknown[], U extends string | void>(fn: (...args: T) => unknown): Middleware<T, U>['handle'] | MiddlewareAsync<T, U>['handle']
{
    return function (...args: T)
    {
        let result: unknown;
        try
        {
            result = fn.apply(this, args);
        }
        catch (e)
        {
            return e;
        }
        if (isPromiseLike(result))
            return result.then(x => { throw x }, x => x);
        else
            throw result
    }
}

/**
 * Converts a function to a middleware.
 * @param {Function} fn - The function to convert.
 * @returns {Object} The middleware object.
 */
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (...args: T) => Promise<unknown>): MiddlewareAsync<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => TReturnType): Middleware<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => TReturnType): TReturnType extends Promise<unknown> ? MiddlewareAsync<T, TSpecialNextParam> : Middleware<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => unknown): MiddlewareAsync<T, TSpecialNextParam> | Middleware<T, TSpecialNextParam>
{
    return {
        handle: toMiddleware<T, TSpecialNextParam>(fn)
    }
}

/**
 * Converts a function to an error middleware.
 * @param {Function} fn - The function to convert.
 * @returns {Object} The error middleware object.
 */
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => Promise<unknown>): ErrorMiddlewareAsync<T, TSpecialNextParam>
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => unknown): ErrorMiddleware<T, TSpecialNextParam>
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => unknown): ErrorMiddleware<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
{
    return {
        handleError: toMiddleware<[Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...T], TSpecialNextParam>(fn)
    }
}

/**
 * Checks if the given object is a middleware error.
 * @param {Object} x - The object to check.
 * @returns {boolean} True if the object is a middleware error, false otherwise.
 */
export function isMiddlewareError<TSpecialNextParam extends SpecialNextParam = SpecialNextParam>(x: MiddlewareError<MiddlewareResult<TSpecialNextParam>> | MiddlewareSuccess<unknown>): x is MiddlewareError<MiddlewareResult<TSpecialNextParam>>
{
    return typeof x['error'] != 'undefined';
}

/**
 * Checks if the given middleware is an error middleware.
 * @param {Object} middleware - The middleware to check.
 * @returns {boolean} True if the middleware is an error middleware, false otherwise.
 */
export function isErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | void>(middleware: AnyMiddleware<T, TSpecialNextParam>): middleware is ErrorMiddleware<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
{
    return middleware && middleware['handleError'];
}

/**
 * Checks if the given middleware is a standard middleware.
 * @param {Object} middleware - The middleware to check.
 * @returns {boolean} True if the middleware is a standard middleware, false otherwise.
 */
export function isStandardMiddleware<T extends unknown[], TSpecialNextParam extends string | void>(middleware: AnyMiddleware<T, TSpecialNextParam>): middleware is Middleware<T, TSpecialNextParam> | MiddlewareAsync<T, TSpecialNextParam>
{
    return middleware && middleware['handle'];
}

/**
 * Processes the middleware.
 * @param {Object} middleware - The middleware to process.
 * @param {...*} req - The request parameters.
 * @returns {*} The result of the middleware processing.
 */
export function process<X = unknown, T extends unknown[] = unknown[], TSpecialNextParam extends string | void = SpecialNextParam>(middleware: Middleware<T, TSpecialNextParam>, ...req: T): X
{
    let error: MiddlewareResult<TSpecialNextParam>;
    try
    {
        error = middleware.handle(...req)
    }
    catch (result)
    {
        return result;
    }
    throw error;
}
