import { register, injectWithName, ParsedAny, extend, service, each } from ".";
import { FormatterFactory } from "./formatters/common";
import * as uri from 'url';
import * as qs from 'querystring'
import 'isomorphic-fetch';

export interface HttpOptions
{
    method?: string;
    url: string | uri.UrlObject;
    queryString?: any;
    body?: any;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form';
}

export interface Http<TResponse=any>
{
    get(url: string, params?: any): PromiseLike<TResponse>;
    post(url: string, body?: any): PromiseLike<FormData>;
    postJSON<T=string>(url: string, body?: any): PromiseLike<T>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    call(options: HttpOptions): PromiseLike<TResponse>;
}

@service('$http')
export class FetchHttp implements Http<Response>
{
    constructor()
    {
    }

    public get(url: string, params?: any)
    {
        return this.call({ url: url, method: 'get', queryString: params });
    }
    public post(url: string, body?: any): PromiseLike<FormData>
    {
        return this.call({ method: 'post', url: url, body: body }).then((r) =>
        {
            return r.formData();
        });
    }
    public postJSON<T=string>(url: string, body?: any): PromiseLike<T>
    {
        return this.call({ method: 'post', url: url, body: body, contentType: 'json' }).then((r) =>
        {
            return r.json();
        });
    }
    public getJSON<T>(url: string, params?: any): PromiseLike<T>
    {
        return this.call({ method: 'get', url: url, queryString: params }).then((r) =>
        {
            return r.json();
        });
    }

    public call(options: HttpOptions): Promise<Response>
    {
        var init: RequestInit = { method: options.method, body: options.body };
        if (typeof (options.url) == 'string')
            options.url = uri.parse(options.url, true);
        if (options.queryString)
        {
            if (typeof (options.queryString) == 'string')
                options.queryString = qs.parse(options.queryString);
            options.url.query = extend(options.url.query, options.queryString);
        }

        if (options.headers)
        {
            init.headers = {};
            each(options.headers, function (value, key: string)
            {
                if (value instanceof Date)
                    init.headers[key] = value.toJSON();
                else
                    init.headers[key] = value && value.toString();
            });
        }

        if (options.contentType)
        {
            init.headers = init.headers || {};
            switch (options.contentType)
            {
                case 'json':
                    init.headers['Content-Type'] = 'application/json; charset=UTF-8'
                    break;
                case 'form':
                    init.headers['Content-Type'] = 'multipart/form-data';
                    break;
            }
        }

        return fetch(uri.format(options.url), init);
    }
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