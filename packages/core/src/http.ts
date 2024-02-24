import { injectWithName, register, registerFactory } from './global-injector.js';
import { ParsedAny, Parser } from './parser/parser.js';
import { each, map } from './each.js';
import { module, TypedSerializableObject } from './helpers.js';
import { service } from './service.js';
import { Formatter, FormatterFactory } from './formatters/common.js';
// import http from 'http';
// import https from 'https';
import { Injected } from './injector.js';
import { MiddlewareComposite } from './router/composite.js';
import type { Middleware } from './router/shared.js';


export interface HttpOptions<T>
{
    method?: string;
    url: string | URL;
    queryString?: string | URLSearchParams;
    body?: BodyInit | TypedSerializableObject<T>;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form' | 'form-urlencoded';
    type?: 'json' | 'xml' | 'text' | 'raw';
    // agent?: http.Agent | https.Agent;
}

export interface Http<TResponse = Response>
{
    get(url: string, params?: string | URLSearchParams): PromiseLike<TResponse>;
    post(url: string, body?: unknown): PromiseLike<FormData>;
    postJSON<T = string>(url: string, body?: unknown): PromiseLike<T>;
    getJSON<T>(url: string, params?: string | URLSearchParams): PromiseLike<T>;
    invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean }): PromiseLike<TResponse>;
    call<T>(options: HttpOptions<T>): PromiseLike<TResponse>;
}

export type CallInterceptor = Middleware<[RequestInit, Response]>

register('$http-interceptors', new MiddlewareComposite('$http-interceptors'))

@service('$http', '$http-interceptors')
export class FetchHttp implements Http<Response>
{
    constructor(private interceptor: CallInterceptor)
    {
    }

    public get(url: string, params?: URLSearchParams)
    {
        return this.call({ url: url, method: 'GET', queryString: params });
    }
    public post(url: string, body?: BodyInit): PromiseLike<FormData>
    {
        return this.call({ method: 'POST', url: url, body: body }).then(r =>
        {
            return (r as unknown as globalThis.Response).formData();
        });
    }
    public postJSON<T = string>(url: string, body?: BodyInit): PromiseLike<T>
    {
        return this.call({ method: 'POST', url: url, body: body, contentType: 'json', type: 'json' }).then((r) =>
        {
            return r.json();
        });
    }
    public getJSON<T>(url: string, params?: string | URLSearchParams): PromiseLike<T>
    {
        return this.call({ method: 'GET', url: url, queryString: params, type: 'json' }).then((r) =>
        {
            return r.json();
        });
    }

    public invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean })
    {
        let body = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
            '<u:' + action + ' xmlns:u="' + namespace + '">';
        each(params, function (paramValue, paramName)
        {
            body += '<' + paramName + '><![CDATA[' + paramValue + ']]></' + paramName + '>';
        });
        body += '</u:' + action + '></s:Body></s:Envelope>';
        return this.call({ method: 'POST', url: url, type: 'xml', headers: { SOAPAction: namespace + '#' + action }, body: body });
    }

    public call<T>(options: HttpOptions<T>): Promise<Response>
    {
        const init: RequestInit = { method: options.method || 'GET', body: options.body as unknown as BodyInit, redirect: 'manual' };

        if (typeof (options.url) == 'string')
            options.url = new URL(options.url);

        const url = options.url;
        if (options.queryString)
        {
            if (typeof (options.queryString) == 'string')
                options.queryString = new URLSearchParams(options.queryString);
            options.queryString.forEach((value, name) => url.searchParams.append(name.toString(), value));
        }

        if (options.headers)
        {
            init.headers = {};
            each(options.headers, function (value, key)
            {
                if (value instanceof Date)
                    init.headers[key as string] = value.toJSON();
                else
                    init.headers[key as string] = value && value.toString();
            });
        }

        if (options.type)
        {
            init.headers = init.headers || {};
            switch (options.type)
            {
                case 'json':
                    init.headers['Accept'] = 'application/json, text/json';
                    if (!options.contentType && typeof (init.body) !== 'string')
                        init.body = JSON.stringify(init.body);
                    break;
                case 'xml':
                    init.headers['Accept'] = 'text/xml';
                    break;
                case 'text':
                    init.headers['Accept'] = 'text/plain';
                    if (!options.contentType && typeof (init.body) !== 'string')
                        init.body = init.body.toString();
                    break;
            }
        }

        if (options.contentType && options.body)
        {
            init.headers = init.headers || {};
            switch (options.contentType)
            {
                case 'json':
                    init.headers['Content-Type'] = 'application/json; charset=UTF-8'
                    if (typeof (init.body) !== 'string')
                        init.body = JSON.stringify(init.body);
                    break;
                case 'form-urlencoded':
                    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                    if (!(init.body instanceof FormData) && typeof init.body !== 'undefined')
                        init.body = FetchHttp.serialize(init.body);
                    break;
                case 'form':
                    init.headers['Content-Type'] = 'multipart/form-data';
                    if (!(init.body instanceof FormData) && typeof init.body !== 'undefined')
                        init.body = FetchHttp.serialize(init.body);
                    break;
            }
        }

        // if (options.agent)
        //     init['agent'] = options.agent;
        return this.fetch(new Request(options.url, init));

    }

    private async fetch(req: Request)
    {
        if (this.interceptor)
        {
            const r = await this.interceptor.handle(req, null).then(err =>
            {
                if (err)
                    throw err;
            }, r => r);
            if (r)
                return r;
        }

        const res = await fetch(req);

        if (this.interceptor)
        {
            const r = await this.interceptor.handle(req, res).then(err =>
            {
                if (err)
                    throw err;
            }, r => r)
            if (r)
                return r;
        }
        if (res.status == 302 || res.status == 301)
        {
            req.headers.set('cookie', res.headers.get('set-cookie'));

            return await this.fetch(new Request(new URL(res.headers.get('Location'), req.url), req));
        }

        if (this.interceptor)
        {
            const r = await this.interceptor.handle(req, res).then(err =>
            {
                if (err)
                    throw err;
            }, r => r)
            if (r)
                return r;
        }

        return res;
    }


    public static serialize(obj, prefix?: string): string
    {
        return map(obj, function (value, key: string)
        {

            if (typeof (value) == 'object')
            {

                let keyPrefix = prefix;
                if (prefix)
                {
                    if (typeof (key) == 'number')
                        keyPrefix = prefix.substring(0, prefix.length - 1) + '[' + key + '].';
                    else
                        keyPrefix = prefix + encodeURIComponent(key) + '.';
                }
                return FetchHttp.serialize(value, keyPrefix);
            }
            else
            {
                return (prefix || '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }
        }, true).join('&')
    }

}



export class HttpCallFormatterFactory implements FormatterFactory<Injected<PromiseLike<unknown>>, { method?: keyof Http }>
{
    public parse(expression: string): { method?: keyof Http } & ParsedAny
    {
        const method = /^ *(\w+)/.exec(expression);
        if (method)
            return { method: <keyof Http>method[1], $$length: method[0].length };
        return new Parser().parseAny(expression) as { method?: keyof Http } & ParsedAny;
    }
    public build(settings: { method: keyof Http }): Formatter<Injected<PromiseLike<unknown>>>
    {
        if (!settings)
            settings = { method: 'getJSON' };

        return function (scope)
        {
            let settingsValue = settings as HttpOptions<void> & { method?: keyof Http };
            if (settings instanceof Function)
                settingsValue = settings(scope);

            return injectWithName(['$http'], function (http: Http)
            {
                const formattedValue = scope;
                if (typeof (formattedValue) == 'string')
                    return (http[settingsValue.method || 'getJSON'] as typeof http.getJSON)(formattedValue, settingsValue.queryString);

                if (Array.isArray(formattedValue))
                {
                    return (http[settingsValue.method || 'getJSON'] as typeof http.getJSON).apply(http, formattedValue);
                }

                return (http[settingsValue.method || 'getJSON'] as typeof http.call)(formattedValue as HttpOptions<void>);
            });
        }
    }
}

export class HttpFormatterFactory implements FormatterFactory<PromiseLike<unknown>, { method?: keyof Http }>
{
    callFactory: HttpCallFormatterFactory;

    constructor()
    {
        this.callFactory = module('$formatters').resolve<HttpCallFormatterFactory>('#httpCall');
    }

    parse(expression: string): { method?: keyof Http; }
    {
        return this.callFactory.parse(expression);
    }

    public build(settings: { method: keyof Http })
    {
        return (value: unknown) =>
        {
            return this.callFactory.build(settings)(value)();
        };
    }
}

module('$formatters').register('#http', new HttpFormatterFactory());
module('$formatters').register('#httpCall', new HttpCallFormatterFactory());