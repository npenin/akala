import { Injector, injectWithName } from './injector';
import * as express from 'express';

export function command($inject: string[], f: Function)
{
    return function (request: express.Request, response: express.Response, next: express.NextFunction)
    {
        var injector = <Injector>request['injector'];
        var injectable = injector.injectWithName($inject, f);
        injectable(this);
    }
}

export interface Http
{
    get(url: string, params?: any): PromiseLike<string>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call(method: string, url: string, params?: any): PromiseLike<string>;
}