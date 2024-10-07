import { Injector, HttpOptions, each, Http, defaultInjector, MiddlewarePromise, SerializableObject, base64, SimpleInjector, ErrorWithStatus, HttpStatusCode, UrlTemplate } from '@akala/core';
import { CommandProcessor, StructuredParameters } from '../model/processor.js';
import { Command, Configuration } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { HandlerResult, handlers } from '../protocol-handler.js';
import { Local } from './local.js';
import { Metadata } from '../index.browser.js';

export class HttpClient extends CommandProcessor
{
    public static fromUrl(url: string | URL)
    {
        const injector = new SimpleInjector();

        const resolveUrl = (s: string) => new URL(s, url).toString();
        injector.register('$resolveUrl', resolveUrl);
        return new HttpClient(injector);
    }

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

        function inject(value: object, arg: object)
        {
            if (Array.isArray(value))
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Array is not supported yet');

            const valueEntries = Object.entries(value);

            valueEntries.forEach(e =>
            {
                switch (typeof e[1])
                {
                    case 'string':
                        {
                            const indexOfDot = e[1].indexOf('.');
                            const key = ~indexOfDot ? e[1].substring(0, indexOfDot) : e[1];
                            const subKey: string | undefined = ~indexOfDot ? e[1].substring(indexOfDot + 1) : undefined;
                            switch (key)
                            {
                                case 'body':
                                    options.contentType = options.type as HttpOptions<unknown>['contentType'];
                                    if (typeof subKey !== 'undefined')
                                    {
                                        options.body = options.body || {};
                                        options.body[subKey] = arg && arg[e[0]];
                                    }
                                    else
                                    {
                                        if (options.body)
                                            throw new ErrorWithStatus(HttpStatusCode.BadRequest, 'The request cannot define both body properties and the complete body object');

                                        options.body = Object.fromEntries(Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0])));
                                    }
                                    break;
                                case 'header':
                                    if (typeof subKey !== 'undefined')
                                    {
                                        options.headers = options.headers || {};
                                        options.headers[subKey] = arg && arg[e[0]];
                                    }
                                    else
                                        options.headers = Object.assign(options.headers || {}, Object.fromEntries(Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0]))));
                                    break;
                                case 'query':
                                    if (!options.queryString)
                                        options.queryString = new URLSearchParams();
                                    if (typeof options.queryString == 'string')
                                        options.queryString = new URLSearchParams(options.queryString)
                                    if (typeof subKey !== 'undefined')
                                        options.queryString.append(subKey, arg && arg[e[0]] as string);
                                    else
                                        Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0])).forEach(e => (options.queryString as URLSearchParams).append(e[0], param[e[0]]));
                                    break;
                                case 'route':
                                    if (!route)
                                        route = {};
                                    if (arg && arg[e[0]])
                                        if (subKey)
                                            route[subKey] = arg && arg[e[0]] && arg[e[0]].toString();
                                        else
                                            Object.assign(Object.fromEntries(Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0]))));
                                    break;
                            }
                        }
                        break;
                    case 'object':
                        inject(e[1], arg[e[0]]);
                        break;
                    default:
                        throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Not supported')
                }
            })
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
                            if (typeof value == 'object')
                            {
                                inject(value, param[key] as object);
                                break;
                            }
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
            options.url = resolveUrl(UrlTemplate.expand(UrlTemplate.parse(url), route))
        else
            options.url = resolveUrl(url);

        if (typeof auth != 'undefined' && config.http.auth)
        {
            switch (config.http.auth.mode)
            {
                case 'basic':
                    if (typeof auth !== 'object' || !('username' in auth) || !('password' in auth) || typeof auth.username !== 'string' || typeof auth.password !== 'string')
                        throw new Error('When using basic mode, the authentication has to be in form of {username:string, password:string}');
                    if (!options.headers)
                        options.headers = {};

                    options.headers.authorization = 'Basic ' + base64.base64EncArr(base64.strToUTF8Arr(auth.username + ':' + auth.password));
                    break;
                case 'bearer':
                    if (typeof auth !== 'string')
                        throw new Error('When using bearer mode, the authentication has to be a string')
                    if (!options.headers)
                        options.headers = {};
                    options.headers.authorization = 'Bearer ' + auth;
                    break;
                default:

                    if (typeof auth !== 'string')
                        throw new Error('When using ' + config.http.auth.mode.type + ' mode, the authentication has to be a string')

                    switch (config.http.auth.mode.type)
                    {
                        case 'cookie':
                            if (!options.headers.cookie)
                                options.headers.cookie = '';
                            options.headers.cookie += encodeURIComponent(config.http.auth.mode.name) + '=' + encodeURIComponent(auth);
                            break;
                        case 'query':
                            options.queryString[config.http.auth.mode.name] = auth;
                            break;
                        case 'header':
                            options.headers[config.http.auth.mode.name] = auth;
                            break;
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