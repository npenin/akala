import { each, map } from './each.js';
import { module, TypedSerializableObject } from './helpers.js';
import { service } from './service.js';
import { Formatter } from './formatters/common.js';
import type { MiddlewareAsync } from './middlewares/shared.js';
import { defaultInjector } from './injectors/simple-injector.js';
import { MiddlewareCompositeAsync } from './index.js';

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
        each(params, function (paramValue, paramName)
        {
            body += '<' + paramName + '><![CDATA[' + paramValue + ']]></' + paramName + '>';
        });
        body += '</u:' + action + '></s:Body></s:Envelope>';
        return this.call({ method: 'POST', url: url, type: 'xml', headers: { SOAPAction: namespace + '#' + action }, body: body });
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
        }, true).join('&');
    }
}

type SettingsType = { method?: keyof Http } & Omit<HttpOptions<undefined>, 'url'>;

export class HttpCallFormatter implements Formatter<PromiseLike<Response>>
{
    constructor(private settings: SettingsType) { }

    public format(scope: unknown)
    {
        const settings = this.settings;

        return defaultInjector.injectWithName(['$http'], function (http: Http)
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

/**
 * Enumeration of standard HTTP status codes with descriptive documentation.
 */
export enum HttpStatusCode
{
    /** Continue (100) - The server has received the request headers */
    Continue = 100,
    /** Switching Protocols (101) - The server is switching protocols */
    SwitchingProtocols = 101,
    /** Processing (102) - The server is processing the request */
    Processing = 102,
    /** Early Hints (103) - Preload hinting information */
    EarlyHints = 103,

    /** OK (200) - Standard success response */
    OK = 200,
    /** Created (201) - Resource created successfully */
    Created = 201,
    /** Accepted (202) - Request accepted for processing */
    Accepted = 202,
    /** Non-Authoritative Information (203) - Response from cache or third party */
    NonAuthoritativeInformation = 203,
    /** No Content (204) - Successful with no body */
    NoContent = 204,
    /** Reset Content (205) - Client should reset document view */
    ResetContent = 205,
    /** Partial Content (206) - Partial content response */
    PartialContent = 206,
    /** Multi-Status (207) - Multiple status codes for WebDAV */
    MultiStatus = 207,
    /** Already Reported (208) - WebDAV binding members listed */
    AlreadyReported = 208,
    /** IM Used (226) - Instance manipulation applied */
    IMUsed = 226,

    /** Multiple Choices (300) - Multiple redirect options */
    MultipleChoices = 300,
    /** Moved Permanently (301) - Resource permanently moved */
    MovedPermanently = 301,
    /** Found (302) - Temporary redirect */
    Found = 302,
    /** See Other (303) - Redirect via GET */
    SeeOther = 303,
    /** Not Modified (304) - Cached response valid */
    NotModified = 304,
    /** Use Proxy (305) - Use proxy specified */
    UseProxy = 305,
    /** Temporary Redirect (307) - Temporary redirection */
    TemporaryRedirect = 307,
    /** Permanent Redirect (308) - Permanent redirection */
    PermanentRedirect = 308,

    /** Bad Request (400) - Malformed request syntax */
    BadRequest = 400,
    /** Unauthorized (401) - Authentication required */
    Unauthorized = 401,
    /** Payment Required (402) - Payment required */
    PaymentRequired = 402,
    /** Forbidden (403) - Insufficient permissions */
    Forbidden = 403,
    /** Not Found (404) - Resource not found */
    NotFound = 404,
    /** Method Not Allowed (405) - Unsupported HTTP method */
    MethodNotAllowed = 405,
    /** Not Acceptable (406) - Can't satisfy accept headers */
    NotAcceptable = 406,
    /** Proxy Authentication Required (407) - Proxy auth needed */
    ProxyAuthenticationRequired = 407,
    /** Request Timeout (408) - Server timed out waiting */
    RequestTimeout = 408,
    /** Conflict (409) - Resource state conflict */
    Conflict = 409,
    /** Gone (410) - Resource permanently unavailable */
    Gone = 410,
    /** Length Required (411) - Content-Length missing */
    LengthRequired = 411,
    /** Precondition Failed (412) - Server precondition failed */
    PreconditionFailed = 412,
    /** Payload Too Large (413) - Request entity too large */
    PayloadTooLarge = 413,
    /** URI Too Long (414) - Request URI too long */
    URITooLong = 414,
    /** Unsupported Media Type (415) - Unsupported content type */
    UnsupportedMediaType = 415,
    /** Range Not Satisfiable (416) - Can't satisfy range request */
    RangeNotSatisfiable = 416,
    /** Expectation Failed (417) - Can't meet Expect header */
    ExpectationFailed = 417,
    /** I'm a teapot (418) - April Fools joke code */
    IAmATeapot = 418,
    /** Misdirected Request (421) - Wrong server path */
    MisdirectedRequest = 421,
    /** Unprocessable Entity (422) - Semantic errors */
    UnprocessableEntity = 422,
    /** Locked (423) - WebDAV resource locked */
    Locked = 423,
    /** Failed Dependency (424) - WebDAV dependency failed */
    FailedDependency = 424,
    /** Too Early (425) - Risk of replay request */
    TooEarly = 425,
    /** Upgrade Required (426) - Protocol upgrade needed */
    UpgradeRequired = 426,
    /** Precondition Required (428) - Conditional request required */
    PreconditionRequired = 428,
    /** Too Many Requests (429) - Rate limiting */
    TooManyRequests = 429,
    /** Request Header Fields Too Large (431) - Headers too large */
    RequestHeaderFieldsTooLarge = 431,
    /** Unavailable For Legal Reasons (451) - Legal restriction */
    UnavailableForLegalReasons = 451,

    /** Internal Server Error (500) - Generic server error */
    InternalServerError = 500,
    /** NotImplemented (501) - Unsupported functionality */
    NotImplemented = 501,
    /** Bad Gateway (502) - Invalid upstream response */
    BadGateway = 502,
    /** Service Unavailable (503) - Temporary overload */
    ServiceUnavailable = 503,
    /** Gateway Timeout (504) - Upstream timeout */
    GatewayTimeout = 504,
    /** HTTP Version Not Supported (505) - Unsupported version */
    HTTPVersionNotSupported = 505,
    /** Variant Also Negotiates (506) - Content negotiation error */
    VariantAlsoNegotiates = 506,
    /** Insufficient Storage (507) - WebDAV storage full */
    InsufficientStorage = 507,
    /** Loop Detected (508) - Infinite loop detected */
    LoopDetected = 508,
    /** Not Extended (510) - Further extensions needed */
    NotExtended = 510,
    /** Network Authentication Required (511) - Network auth required */
    NetworkAuthenticationRequired = 511
}

module('$formatters').register('#http', HttpCallFormatter);
