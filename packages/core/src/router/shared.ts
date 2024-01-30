/* A middleware promise is the opposite of a promise which will fail when there is a result 
 * and which will succeed as long as there is no middleware that handled the context
 */
export type MiddlewarePromise<T extends string | void = SpecialNextParam> = Promise<MiddlewareResult<T>>;
export type MiddlewareResult<T extends string | void = SpecialNextParam> = Error | T | OptionsResponse;

export interface Middleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> 
{
    handle(...context: T): MiddlewarePromise<TSpecialNextParam>;
}

export interface ErrorMiddleware<T extends unknown[], U extends string | void = SpecialNextParam> 
{
    handleError(error: Exclude<MiddlewareResult<U>, U>, ...context: T): MiddlewarePromise<U>;
}

export type AnyMiddleware<T extends unknown[], TSpecialNextParam extends string | void = SpecialNextParam> = Middleware<T, TSpecialNextParam> | ErrorMiddleware<T, TSpecialNextParam>;

export type OptionsResponse = { allow: string[] };

export type MiddlewareError<T = unknown> = { error: T };
export type MiddlewareSuccess<T = unknown> = { success: T | Promise<T> };
export type SpecialNextParam = 'break' | void;

