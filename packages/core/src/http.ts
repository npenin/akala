import { register, injectWithName } from './global-injector.js';
import { ParsedAny, Parser } from './parser.js';
import { each, map, grep } from './each.js';
import { extend, module } from './helpers.js';
import { service } from './service.js';
import { FormatterFactory } from './formatters/common.js';
import * as uri from 'url';
import * as qs from 'querystring'
import 'isomorphic-fetch';
import fetch, { RequestInit, Response } from 'node-fetch'
import http from 'http';
import https from 'https';
import { Injected } from './injector.js';

export interface HttpOptions
{
    method?: string;
    url: string | uri.UrlObject;
    queryString?: any;
    body?: any;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form';
    type?: 'json' | 'xml' | 'text' | 'raw';
    agent?: http.Agent | https.Agent;
}

export interface Http<TResponse = Response>
{
    get(url: string, params?: any): PromiseLike<TResponse>;
    post(url: string, body?: any): PromiseLike<FormData>;
    postJSON<T = string>(url: string, body?: any): PromiseLike<T>;
    getJSON<T>(url: string, params?: any): PromiseLike<T>;
    invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean }): PromiseLike<TResponse>;
    call(options: HttpOptions): PromiseLike<TResponse>;
}

@service('$http')
export class FetchHttp implements Http<Response>
{
    public get(url: string, params?: any)
    {
        return this.call({ url: url, method: 'GET', queryString: params });
    }
    public post(url: string, body?: any): PromiseLike<FormData>
    {
        return this.call({ method: 'POST', url: url, body: body }).then(r =>
        {
            return (r as unknown as globalThis.Response).formData();
        });
    }
    public postJSON<T = string>(url: string, body?: any): PromiseLike<T>
    {
        return this.call({ method: 'POST', url: url, body: body, contentType: 'json', type: 'json' }).then((r) =>
        {
            return r.json();
        });
    }
    public getJSON<T>(url: string, params?: any): PromiseLike<T>
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

    public call(options: HttpOptions): Promise<Response>
    {
        const init: RequestInit = { method: options.method || 'GET', body: options.body };
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
                case 'form':
                    init.headers['Content-Type'] = 'multipart/form-data';
                    if (!(init.body instanceof FormData) && typeof init.body == 'undefined')
                        init.body = FetchHttp.serialize(init.body);
                    break;
            }
        }

        if (options.agent)
            init.agent = options.agent;

        return fetch(uri.format(options.url), init);
    }


    public static serialize(obj, prefix?: string)
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
        }, true)
    }

}



export class HttpCallFormatterFactory implements FormatterFactory<() => Promise<any>, { method?: keyof Http }>
{
    public parse(expression: string): { method?: keyof Http } & ParsedAny
    {
        const method = /^ *(\w+)/.exec(expression);
        if (method)
            return { method: <keyof Http>method[1], $$length: method[0].length };
        return new Parser().parseAny(expression, false);
    }
    public build(formatter, settings: { method: keyof Http }): Injected<any>
    {
        if (!settings)
            settings = { method: 'getJSON' };

        return function (scope)
        {
            let settingsValue = settings as HttpOptions & { method?: keyof Http };
            if (settings instanceof Function)
                settingsValue = settings(scope);

            return injectWithName(['$http'], function (http: Http)
            {
                const formattedValue = formatter(scope);
                if (typeof (formattedValue) == 'string')
                    return (http[settingsValue.method || 'getJSON'] as typeof http.getJSON)(formattedValue, grep(settingsValue, function (value, key)
                    {
                        return key != 'method';
                    }));

                if (Array.isArray(formattedValue))
                {
                    return (http[settingsValue.method || 'getJSON'] as typeof http.getJSON).apply(http, formattedValue);
                }

                return (http[settingsValue.method || 'getJSON'] as typeof http.getJSON)(formattedValue);
            });
        }
    }
}

export class HttpFormatterFactory extends HttpCallFormatterFactory implements FormatterFactory<Promise<any>, { method?: keyof Http }>
{
    constructor()
    {
        super();
    }

    public build(formatter, settings: { method: keyof Http })
    {
        return (value) =>
        {
            return super.build(formatter, settings)(value)();
        };
    }
}

module('$formatters').register('#http', new HttpFormatterFactory());
module('$formatters').register('#httpCall', new HttpCallFormatterFactory());