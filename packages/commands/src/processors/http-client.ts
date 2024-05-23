import { Injector, HttpOptions, each, Http, defaultInjector, MiddlewarePromise, SerializableObject, base64, SimpleInjector } from '@akala/core';
import * as pathRegexp from 'path-to-regexp';
import { CommandProcessor, StructuredParameters } from '../model/processor.js';
import { Command, Configuration } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { HandlerResult, handlers } from '../protocol-handler.js';
import { Local } from './local.js';
import { Metadata } from '../index.browser.js';

export class HttpClient extends CommandProcessor
{

    public static handler(protocol: 'http' | 'https'): (url: URL) => Promise<HandlerResult<HttpClient>>
    {
        const injector = new SimpleInjector();
        return function (url)
        {
            url = new URL(url);
            url.protocol = protocol;
            const resolveUrl = (s: string) => new URL(s, url).toString();
            injector.register('$resolveUrl', resolveUrl);
            return Promise.resolve({
                processor: new HttpClient(injector), getMetadata()
                {
                    return injector.injectWithName(['$http'], async (http: Http) => (await http.call(HttpClient.buildCall({ http: { method: 'GET', route: '$metadata' } }, resolveUrl, null))).json())(this)
                }
            })
        }
    }

    public handle(origin: Container<unknown>, command: Command, param: StructuredParameters): MiddlewarePromise
    {
        if (!command.config)
            throw new Error('no trigger configuration defined');

        const config = command.config.http as unknown as HttpConfiguration;
        if (!config)
            throw new Error('no http configuration specified');

        const injector = param.injector || this.injector;
        return injector.injectWithNameAsync(['$http', '$resolveUrl'], async function (http: Http, resolveUrl: (url: string) => string)
        {
            const res = await http.call(Local.execute(command, (...args) => HttpClient.buildCall(command.config, resolveUrl, param.auth, ...args), origin, param));
            switch (config.type)
            {
                case 'raw':
                    return res;
                case 'text':
                    return res.text();
                case 'json':
                default:
                    if (res.status != 201 && (!res.headers.has('content-length') || Number(res.headers.get('content-length')) > 0))
                        return res.json();
                    return null;
            }
        }).then(result => { throw result }, err => err);
    }

    public static buildCall(config: Metadata.Configurations, resolveUrl: (s: string) => string, auth: unknown, ...param: unknown[]): HttpOptions<unknown>
    {
        let url = config.http.route;
        if (url[0] == '/')
            url = url.substring(1);
        let route: { [key: string]: unknown } | null = null;
        if (config.http.type == 'raw')
        {
            config.http = Object.assign({}, config.http);
            config.http.type = undefined;
        }
        const options: HttpOptions<unknown> = { method: config.http.method, url: '', type: config.http.type };
        if (config.auth.http)
        {
            switch (config.auth.http.mode)
            {
                case 'basic':
                case 'bearer':
                    break;
                default:
                    switch (config.auth.http.mode.type)
                    {
                        case 'query':
                        case 'header':
                    }
            }
        }
        if (config.http.inject)
            each(config.http.inject, function (value, key)
            {
                switch (value)
                {
                    case 'body':
                        if (typeof (param[key]) == 'object')
                        {
                            options.contentType = options.type as HttpOptions<unknown>['contentType'];
                            options.body = Object.assign(options.body || {}, param && param[key]);
                        }
                        else
                        {
                            options.contentType = options.type as HttpOptions<unknown>['contentType'];
                            if (!options.body)
                                options.body = {};
                            options.body = param && param[key] as BodyInit | SerializableObject;
                        }
                        break;
                    default:
                        {
                            const indexOfDot = value.indexOf('.');
                            if (~indexOfDot)
                            {
                                const subKey = value.substring(indexOfDot + 1);
                                switch (value.substring(0, indexOfDot))
                                {
                                    case 'body':
                                        options.contentType = options.type as HttpOptions<unknown>['contentType'];
                                        options.body = options.body || {};
                                        options.body[subKey] = param && param[key];
                                        break;
                                    case 'header':
                                        if (!options.headers)
                                            options.headers = {};
                                        options.headers[subKey] = param && param[key] as string | number | Date;
                                        break;
                                    case 'query':
                                        if (!options.queryString)
                                            options.queryString = new URLSearchParams();
                                        if (typeof options.queryString == 'string')
                                            options.queryString = new URLSearchParams(options.queryString)
                                        options.queryString.append(subKey, param && param[key] as string);
                                        break;
                                    case 'route':
                                        if (!route)
                                            route = {};
                                        if (param && param[key])
                                            route[subKey] = param && param[key] && param[key].toString();
                                        break;
                                }
                                break;
                            }
                        }
                }
            })
        if (route)
            options.url = resolveUrl(pathRegexp.compile(url)(route))
        else
            options.url = resolveUrl(url);

        if (typeof auth != 'undefined' && config.auth?.http)
        {
            switch (config.auth.http.mode)
            {
                case 'basic':
                    if (typeof auth !== 'object' || !('username' in auth) || !('password' in auth) || typeof auth.username !== 'string' || typeof auth.password !== 'string')
                        throw new Error('When using basic mode, the authentication has to be in form of {username:string, password:string}');

                    options.headers.authorization = 'Basic ' + base64.base64EncArr(base64.strToUTF8Arr(auth.username + ':' + auth.password));
                    break;
                case 'bearer':
                    if (typeof auth !== 'string')
                        throw new Error('When using bearer mode, the authentication has to be a string')
                    options.headers.authorization = 'Bearer ' + auth;
                    break;
                default:

                    if (typeof auth !== 'string')
                        throw new Error('When using ' + config.auth.http.mode.type + ' mode, the authentication has to be a string')

                    switch (config.auth.http.mode.type)
                    {
                        case 'cookie':
                            if (!options.headers.cookie)
                                options.headers.cookie = '';
                            options.headers.cookie += encodeURIComponent(config.auth.http.mode.name) + '=' + encodeURIComponent(auth);
                        case 'query':
                            options.queryString[config.auth.http.mode.name] = auth;
                        case 'header':
                            options.headers[config.auth.http.mode.name] = auth;
                    }
            }
        }

        return options;
    }

    private readonly injector: Injector;

    constructor(injector?: Injector)
    {
        super('http')

        this.injector = injector || defaultInjector;
    }
}

handlers.useProtocol('http', HttpClient.handler('http'));
handlers.useProtocol('https', HttpClient.handler('https'));

export interface HttpConfiguration extends Configuration
{
    method: string;
    route: string;
    type?: 'json' | 'xml' | 'text' | 'raw';
    auth?: Configuration & {
        mode: 'basic' | 'bearer' | { type: 'query' | 'header' | 'cookie', name: string }

    }
}