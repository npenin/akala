import * as di from '@akala/core';
export declare class Http implements di.Http {
    constructor();
    get(url: string, params?: any): PromiseLike<string>;
    getJSON(url: string, params?: any): PromiseLike<any>;
    call(method: string, url: string, params?: any): PromiseLike<string>;
}
