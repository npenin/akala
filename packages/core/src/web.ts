import { register, injectWithName } from ".";
import { FormatterFactory } from "./formatters/common";
import { resolve } from "q";

export interface HttpOptions
{
    method?: string;
    url: string;
    params?: any;
    body?: any;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form';
    type?: 'json' | 'xml';
}

export interface Http<TResponse=any>
{
    get<T=string>(url: string, params?: any): PromiseLike<T>;
    post<T=string>(url: string, body?: any): PromiseLike<T>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call<T=string>(method: string, url: string, params?: any): PromiseLike<{ response: TResponse, body: T }>;
    call<T=string>(options: HttpOptions): PromiseLike<{ response: TResponse, body: T }>;
}

register('#http', {
    parse: function (expression: string)
    {
        var method = /\w+/.exec(expression);
        if (method)
            return { method: method[0] };
        return { method: 'getJSON', $$length: method[0].length };
    },
    build: function (formatter, settings)
    {
        return function (value)
        {
            return injectWithName(['$http'], function (http: Http)
            {
                return http[value](value);
            })();
        }
    }
} as FormatterFactory<Promise<any>, { method: 'get' | 'post' | 'getJSON' }>);