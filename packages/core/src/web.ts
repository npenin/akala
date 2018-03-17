import { register, injectWithName, ParsedAny } from ".";
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

export class HttpFormatterFactory implements FormatterFactory<Promise<any>, { method: keyof Http }>
{
    constructor() { }
    public parse(expression: string): { method: keyof Http } & ParsedAny
    {
        var method = /\w+/.exec(expression);
        if (method)
            return { method: <keyof Http>method[0], $$length: method[0].length };
        return { method: 'getJSON', $$length: 0 };
    }
    public build(formatter, settings: { method: keyof Http })
    {
        if (!settings)
            settings = { method: 'getJSON' };
            
        return function (value)
        {
            return injectWithName(['$http'], function (http: Http)
            {
                return (http[settings.method] as Function)(formatter(value));
            })();
        }
    }
}

register('#http', new HttpFormatterFactory());