/// <reference types="express" />
import * as express from 'express';
export declare function command($inject: string[], f: Function): (request: express.Request, response: express.Response, next: express.NextFunction) => void;
export interface Http {
    get(url: string, params?: any): PromiseLike<string>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call(method: string, url: string, params?: any): PromiseLike<string>;
}
