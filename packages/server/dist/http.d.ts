import * as di from '@akala/core';
import * as ajax from 'request';
export declare class Http implements di.Http {
    constructor();
    get(url: string, params?: any): PromiseLike<string>;
    getJSON(url: string, params?: any): PromiseLike<string>;
    call(method: string, url: string, params?: any, options?: ajax.CoreOptions): PromiseLike<string>;
}
