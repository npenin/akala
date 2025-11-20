import { isPromiseLike } from "../promiseHelpers.js";

/* A middleware promise is the opposite of a promise which will fail when there is a result 
 * and which will succeed as long as there is no middleware that handled the context
 */
export type MiddlewarePromise<T extends string | undefined = SpecialNextParam> = Promise<MiddlewareResult<T>>;
export type MiddlewareResult<T extends string | undefined = SpecialNextParam> = Error | T | OptionsResponse;

/**
 * Defines a middleware interface that handles context and returns a result.
 * @template T - The context parameters the middleware handles.
 * @template TSpecialNextParam - The special next parameter type.
 */
export interface Middleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> 
{
    /**
     * Handles the provided context and returns a middleware result.
     * @param ...context - The context parameters to process.
     * @returns The result of the middleware processing.
     */
    handle(...context: T): MiddlewareResult<TSpecialNextParam>;
}

/**
 * Defines an error middleware interface to handle errors in the context.
 * @template T - The context parameters the middleware handles.
 * @template U - The special next parameter type.
 */
export interface ErrorMiddleware<T extends unknown[], U extends string | undefined = SpecialNextParam> 
{
    /**
     * Handles an error and the provided context.
     * @param error - The error or options response to handle.
     * @param ...context - The context parameters associated with the error.
     * @returns The result of error handling.
     */
    handleError(error: MiddlewareResult<U>, ...context: T): MiddlewareResult<U>;
}

export interface MiddlewareAsync<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> 
{
    handle(...context: T): Promise<MiddlewareResult<TSpecialNextParam>>;
}

export interface ErrorMiddlewareAsync<T extends unknown[], U extends string | undefined = SpecialNextParam> 
{
    handleError(error: MiddlewareResult<U>, ...context: T): Promise<MiddlewareResult<U>>;
}

export type AnyAsyncMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> =
    MiddlewareAsync<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
    ;

export type AnySyncMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> =
    Middleware<T, TSpecialNextParam> | ErrorMiddleware<T, TSpecialNextParam>
    ;
export type AnyMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam> =
    AnyAsyncMiddleware<T, TSpecialNextParam> | AnySyncMiddleware<T, TSpecialNextParam>
    ;

export type OptionsResponse = { allow: string[] };

export type MiddlewareError<T = unknown> = { error: T };
export type MiddlewareSuccess<T = unknown> = { success: T | Promise<T> };
export type SpecialNextParam = 'break' | undefined;

export const NotHandled = Promise.resolve<undefined>(undefined);

/**
 * Converts a function into a middleware handler.
 * @template T - The function's argument types.
 * @template U - The special next parameter type.
 * @param fn - The function to convert into a middleware.
 * @returns A middleware handler function.
 */
export function toMiddleware<T extends unknown[], U extends string | undefined>(fn: (...args: T) => unknown): Middleware<T, U>['handle']
export function toMiddleware<T extends unknown[], U extends string | undefined>(fn: (...args: T) => Promise<unknown>): MiddlewareAsync<T, U>['handle']
export function toMiddleware<T extends unknown[], U extends string | undefined>(fn: (...args: T) => unknown): Middleware<T, U>['handle'] | MiddlewareAsync<T, U>['handle']
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
 * Converts a function into a middleware object.
 * @template T - The function's argument types.
 * @template TSpecialNextParam - The special next parameter type.
 * @param fn - The function to convert into a middleware.
 * @returns A middleware object with appropriate handling methods.
 */
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam>(fn: (...args: T) => Promise<unknown>): MiddlewareAsync<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => TReturnType): Middleware<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => TReturnType): TReturnType extends Promise<unknown> ? MiddlewareAsync<T, TSpecialNextParam> : Middleware<T, TSpecialNextParam>
export function convertToMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam, TReturnType = unknown>(fn: (...args: T) => unknown): MiddlewareAsync<T, TSpecialNextParam> | Middleware<T, TSpecialNextParam>
{
    return {
        handle: toMiddleware<T, TSpecialNextParam>(fn)
    }
}

/**
 * Converts a function into an error middleware object.
 * @template T - The context argument types.
 * @template TSpecialNextParam - The special next parameter type.
 * @param fn - The function to convert into an error middleware.
 * @returns An error middleware object with error handling capabilities.
 */
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => Promise<unknown>): ErrorMiddlewareAsync<T, TSpecialNextParam>
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => unknown): ErrorMiddleware<T, TSpecialNextParam>
export function convertToErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam>(fn: (error: Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...args: T) => unknown): ErrorMiddleware<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
{
    return {
        handleError: toMiddleware<[Exclude<MiddlewareResult<TSpecialNextParam>, TSpecialNextParam>, ...T], TSpecialNextParam>(fn)
    }
}

/**
 * Checks if a value represents a middleware error.
 * @template TSpecialNextParam - The special next parameter type.
 * @param x - The value to check.
 * @returns True if the value is a middleware error, false otherwise.
 */
export function isMiddlewareError<TSpecialNextParam extends SpecialNextParam = SpecialNextParam>(x: MiddlewareError<MiddlewareResult<TSpecialNextParam>> | MiddlewareSuccess<unknown>): x is MiddlewareError<MiddlewareResult<TSpecialNextParam>>
{
    return typeof x['error'] != 'undefined';
}

/**
 * Checks if a middleware is an error middleware.
 * @template T - The context argument types.
 * @template TSpecialNextParam - The special next parameter type.
 * @param middleware - The middleware to check.
 * @returns True if the middleware handles errors, false otherwise.
 */
export function isErrorMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined>(middleware: unknown): middleware is ErrorMiddleware<T, TSpecialNextParam> | ErrorMiddlewareAsync<T, TSpecialNextParam>
{
    return typeof middleware?.['handleError'] == 'function';
}

/**
 * Checks if a middleware is a standard (non-error) middleware.
 * @template T - The context argument types.
 * @template TSpecialNextParam - The special next parameter type.
 * @param middleware - The middleware to check.
 * @returns True if the middleware is standard, false otherwise.
 */
export function isStandardMiddleware<T extends unknown[], TSpecialNextParam extends string | undefined>(middleware: unknown): middleware is Middleware<T, TSpecialNextParam> | MiddlewareAsync<T, TSpecialNextParam>
{
    return typeof middleware?.['handle'] == 'function';
}

/**
 * Processes a middleware with the provided context.
 * @template X - The expected result type.
 * @template T - The context parameters.
 * @template TSpecialNextParam - The special next parameter type.
 * @param middleware - The middleware to process.
 * @param ...req - The context parameters for processing.
 * @returns The processed result.
 */
export function process<X = unknown, T extends unknown[] = unknown[], TSpecialNextParam extends string | undefined = SpecialNextParam>(middleware: Middleware<T, TSpecialNextParam> | MiddlewareAsync<T, TSpecialNextParam>, ...req: T): X
{
    let error: MiddlewareResult<TSpecialNextParam> | Promise<MiddlewareResult<TSpecialNextParam>>;
    try
    {
        error = middleware.handle(...req)
    }
    catch (result)
    {
        return result as X;
    }
    throw error;
}
