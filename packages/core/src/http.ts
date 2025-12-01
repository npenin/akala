import { each, map } from './each.js';
import { service } from './service.js';
import type { Formatter } from './formatters/common.js';
import { formatters } from './formatters/index.js'
import type { MiddlewareAsync } from './middlewares/shared.js';
import { defaultInjector } from './injectors/simple-injector.js';
import { MiddlewareCompositeAsync } from './middlewares/composite-async.js';
import type { TypedSerializableObject } from './helpers.js';

/**
 * Configuration options for HTTP requests.
 */
export interface HttpOptions<T>
{
    method?: string;
    url: string | URL;
    queryString?: string | URLSearchParams;
    body?: BodyInit | TypedSerializableObject<T>;
    headers?: { [key: string]: string | number | Date };
    contentType?: 'json' | 'form' | 'form-urlencoded';
    type?: 'json' | 'xml' | 'text' | 'raw';
}

/**
 * Interface defining methods for making HTTP requests.
 */
export interface Http<TResponse = Response>
{
    /**
     * Sends a GET request to the specified URL.
     * @param url The URL to request.
     * @param params Query parameters to append.
     * @returns A promise resolving to the HTTP response.
     */
    get(url: string | URL, params?: string | URLSearchParams): PromiseLike<TResponse>;

    /**
     * Sends a POST request with a body.
     * @param url The target URL.
     * @param body The request body.
     * @returns A promise resolving to form data from the response.
     */
    post(url: string | URL, body?: unknown): PromiseLike<FormData>;

    /**
     * Sends a JSON POST request.
     * @param url The target URL.
     * @param body The JSON body content.
     * @returns A promise resolving to the parsed JSON response.
     */
    postJSON<T = string>(url: string | URL, body?: unknown): PromiseLike<T>;

    /**
     * Sends a GET request expecting JSON response.
     * @param url The target URL.
     * @param params Query parameters to include.
     * @returns A promise resolving to the parsed JSON data.
     */
    getJSON<T>(url: string | URL, params?: string | URLSearchParams): PromiseLike<T>;

    /**
     * Sends a SOAP-based POST request.
     * @param namespace SOAP namespace.
     * @param action SOAP action name.
     * @param url The target URL.
     * @param params SOAP parameters.
     * @returns A promise resolving to the SOAP response.
     */
    invokeSOAP(namespace: string, action: string, url: string | URL, params?: { [key: string]: string | number | boolean }): PromiseLike<TResponse>;

    /**
     * Sends a custom HTTP request using options.
     * @param options Configuration for the request.
     * @returns A promise resolving to the HTTP response.
     */
    call<T>(options: HttpOptions<T>): PromiseLike<TResponse>;
}

export type CallInterceptor = MiddlewareAsync<[RequestInit, Response]>;

defaultInjector.register('$http-interceptors', new MiddlewareCompositeAsync('$http-interceptors'));

@service('$http', '$http-interceptors')
export class FetchHttp implements Http<Response>
{
    constructor(private interceptor: CallInterceptor) { }

    /**
     * Sends a GET request to the specified URL.
     * @param url The URL to request.
     * @param params Query parameters to append.
     * @returns A promise resolving to the HTTP response.
     */
    public get(url: string, params?: URLSearchParams)
    {
        return this.call({ url: url, method: 'GET', queryString: params });
    }

    /**
     * Sends a POST request with a body.
     * @param url The target URL.
     * @param body The request body.
     * @returns A promise resolving to form data from the response.
     */
    public post(url: string, body?: BodyInit): PromiseLike<FormData>
    {
        return this.call({ method: 'POST', url: url, body: body }).then(r =>
        {
            return (r as unknown as globalThis.Response).formData();
        });
    }

    /**
     * Sends a JSON POST request.
     * @param url The target URL.
     * @param body The JSON body content.
     * @returns A promise resolving to the parsed JSON response.
     */
    public postJSON<T = string>(url: string, body?: BodyInit): PromiseLike<T>
    {
        return this.call({ method: 'POST', url: url, body: body, contentType: 'json', type: 'json' }).then((r) =>
        {
            return r.json();
        });
    }

    /**
     * Sends a GET request expecting JSON response.
     * @param url The target URL.
     * @param params Query parameters to include.
     * @returns A promise resolving to the parsed JSON data.
     */
    public getJSON<T>(url: string, params?: string | URLSearchParams): PromiseLike<T>
    {
        return this.call({ method: 'GET', url: url, queryString: params, type: 'json' }).then((r) =>
        {
            return r.json();
        });
    }

    /**
     * Sends a SOAP-based POST request.
     * @param namespace SOAP namespace.
     * @param action SOAP action name.
     * @param url The target URL.
     * @param params SOAP parameters.
     * @returns A promise resolving to the SOAP response.
     */
    public invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean })
    {
        let body = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
            '<u:' + action + ' xmlns:u="' + namespace + '">';
        each(params ?? {}, function (paramValue, paramName)
        {
            body += `<${paramName}>${paramValue}</${paramName}>`;
        });
        body += '</u:' + action + '></s:Body></s:Envelope>';
        return this.call({ method: 'POST', url: url, type: 'xml', headers: { 'content-type': 'text/xml', SOAPAction: `"${namespace}#${action}"` }, body: body });
    }

    /**
     * Sends a custom HTTP request using options.
     * @param options Configuration for the request.
     * @returns A promise resolving to the HTTP response.
     */
    public call<T>(options: HttpOptions<T>): Promise<Response>
    {
        const init: RequestInit = { method: options.method || 'GET', body: options.body as unknown as BodyInit, redirect: 'manual' };

        if (typeof (options.url) == 'string')
            options.url = new URL(options.url, globalThis.document?.baseURI);

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
                    init.headers['Content-Type'] = 'application/json; charset=UTF-8';
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

    /**
     * Serializes an object into URL-encoded format.
     */
    public static serialize(obj, prefix?: string): string | FormData
    {
        if (obj instanceof URLSearchParams)
            if (!prefix)
                return obj.toString();
            else
                return this.serialize(Object.fromEntries(obj.entries()), prefix);
        if (globalThis.FormData && obj instanceof globalThis.FormData)
        {
            if (!prefix)
                return obj;
            return this.serialize(Object.fromEntries(obj.entries()), prefix);
        }
        return map(obj, function (value, key: string)
        {
            switch (typeof (value))
            {
                case 'object':
                    {
                        if (value === null)
                            return (prefix || '') + encodeURIComponent(key) + '=';
                        let keyPrefix = prefix;
                        if (prefix)
                        {
                            if (typeof (key) == 'number')
                                keyPrefix = prefix.substring(0, prefix.length - 1) + '[' + key + '].';
                            else
                                keyPrefix = prefix + encodeURIComponent(key) + '.';
                        }
                        return FetchHttp.serialize(value, keyPrefix) as string;
                    }
                case 'undefined':
                    return '';
                default:
                    return (prefix || '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
            }
        }, true).join('&');
    }
}

type SettingsType = { method?: keyof Http } & Omit<HttpOptions<undefined>, 'url'>;

export class HttpCallFormatter implements Formatter<PromiseLike<Response>>
{
    private previousValue: unknown;
    private previousCall: PromiseLike<Response>;

    constructor(private readonly settings: SettingsType) { }

    public format(scope: unknown)
    {
        const settings = this.settings;

        if (this.previousValue === scope)
            return this.previousCall;

        this.previousValue = scope;

        return this.previousCall = defaultInjector.injectWithName(['$http'], function (http: Http)
        {
            const formattedValue = scope;
            if (typeof (formattedValue) == 'string' || formattedValue instanceof URL)
                if (settings)
                    return http.call({ ...settings, url: formattedValue });
                else
                    return http.call({ method: 'GET', type: 'json', url: formattedValue });

            return http.call(formattedValue as HttpOptions<unknown>);
        })();
    }
}

formatters.register('http', HttpCallFormatter);
