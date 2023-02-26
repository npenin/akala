/* A middleware promise is the opposite of a promise which will fail when there is a result 
 * and which will succeed as long as there is no middleware that handled the context
 */
export type MiddlewarePromise = Promise<MiddlewareResult>;
export type MiddlewareResult = Error | SpecialNextParam | OptionsResponse;

export interface Middleware<T extends unknown[]> 
{
    handle(...context: T): MiddlewarePromise;
}

export interface ErrorMiddleware<T extends unknown[]> 
{
    handleError(error: Error | OptionsResponse, ...context: T): MiddlewarePromise;
}

export type AnyMiddleware<T extends unknown[]> = Middleware<T> | ErrorMiddleware<T>;

export type OptionsResponse = { allow: string[] };

export type MiddlewareError<T = unknown> = { error: T };
export type MiddlewareSuccess<T = unknown> = { success: T | Promise<T> };
export type SpecialNextParam = 'break' | void;

