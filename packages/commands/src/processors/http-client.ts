import { Injector, HttpOptions, each, Http, defaultInjector, MiddlewarePromise, SerializableObject, base64, SimpleInjector, ErrorWithStatus, HttpStatusCode, UrlTemplate, MiddlewareCompositeWithPriority } from '@akala/core';
import { CommandProcessor, StructuredParameters } from '../model/processor.js';
import { Command, Configuration, ConfigurationWithAuth } from '../metadata/index.js';
import { Container } from '../model/container.js';
import { HandlerResult, protocolHandlers as handlers } from '../protocol-handler.js';
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
            const res = await http.call(await Local.execute(command, (...args) => HttpClient.buildCall(command.config, resolveUrl, param.auth, ...args), origin, param));
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
        })().then(result => { throw result }, err => err);
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
        const options: HttpOptions<unknown> = { method: config.http.method, url: '', type: config.http.type, contentType: config.http.contentType };

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
                                    if (!options.contentType)
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
                                        Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0])).forEach(e => (options.queryString as URLSearchParams).append(e[0], arg[e[0]]));
                                    break;
                                case 'route':
                                    if (!route)
                                        route = {};
                                    if (arg && arg[e[0]])
                                        if (subKey)
                                            route[subKey] = arg && arg[e[0]] && arg[e[0]].toString();
                                        else
                                            Object.assign(route, Object.fromEntries(Object.entries(arg).filter(e2 => !valueEntries.find(e3 => e3[0] == e2[0]))));
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
                            if (typeof value == 'symbol')
                                throw new ErrorWithStatus(HttpStatusCode.PreconditionFailed, 'Symbols are not allowed in http client');

                            const indexOfDot = value.indexOf('.');
                            if (~indexOfDot)
                            {
                                const subKey = value.substring(indexOfDot + 1);
                                switch (value.substring(0, indexOfDot))
                                {
                                    case 'body':
                                        options.contentType = options.type as HttpOptions<unknown>['contentType'];
                                        options.body = options.body || {};
                                        options.body[subKey] = param?.[key];
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
                                        options.queryString.append(subKey, param?.[key] as string);
                                        break;
                                    case 'route':
                                        if (!route)
                                            route = {};
                                        if (param?.[key])
                                            route[subKey] = param?.[key]?.toString();
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
            authMiddleware.process(config.http.auth, options, auth);

        return options;
    }

    private readonly injector: Injector;

    constructor(injector?: Injector)
    {
        super('http')

        this.injector = injector || defaultInjector;
    }
}

export const authMiddleware = new MiddlewareCompositeWithPriority<[{ mode: unknown } & Configuration, HttpOptions<unknown>, unknown]>('auth');

authMiddleware.use(100, function (httpConfig, options, auth)
{
    if (httpConfig.mode !== 'basic')
        throw undefined;

    if (httpConfig.inject)
    {
        const inj = new SimpleInjector();
        inj.register('auth', auth);
        auth = inj.inject(httpConfig.inject, auth => auth)(this);
    }

    if (typeof auth !== 'object' || !('username' in auth) || !('password' in auth) || typeof auth.username !== 'string' || typeof auth.password !== 'string')
        throw new Error('When using basic mode, the authentication has to be in form of {username:string, password:string}');
    if (!options.headers)
        options.headers = {};

    return authMiddleware.process({ mode: { type: 'header', name: 'authorization' } }, options, 'Basic ' + base64.base64EncArr(base64.strToUTF8Arr(auth.username + ':' + auth.password)));
})

authMiddleware.use(100, function (httpConfig, options, auth)
{
    if (httpConfig.mode !== 'bearer')
        throw undefined;

    if (typeof auth !== 'string')
        throw new Error('When using bearer mode, the authentication has to be a string')

    return authMiddleware.process({ mode: { type: 'header', name: 'authorization' } }, options, 'Bearer ' + auth);
})

authMiddleware.use(100, function (httpConfig, options, auth)
{
    if (httpConfig.mode !== 'body')
        throw undefined;
    // if (typeof options.body == 'undefined')

    switch (options.contentType)
    {
        case 'json': {
            const inj = new SimpleInjector();
            inj.register('auth', auth);
            if (!httpConfig.inject)
                httpConfig.inject = [];
            inj.injectWithName(httpConfig.inject, (auth) =>
            {
                switch (typeof options.body)
                {
                    case 'string':
                        options.body = JSON.parse(options.body);
                    case 'object':
                        if (options.body === null)
                            options.body = auth;
                        else if (options.body instanceof URLSearchParams)
                            options.body = Object.assign(Object.fromEntries(options.body.entries()), auth);
                        else
                            Object.assign(options.body, auth);
                        break;
                    case 'undefined':
                        options.body = auth;
                        break;
                    default:
                        throw new Error('The body is not an object and cannot be merged with the authentication object');
                }
            })(this);
            break;
        }
        case 'form':
        case 'form-urlencoded':
            if (typeof options.body == 'string')
                options.body = new URLSearchParams(options.body);
            // if (options.body instanceof URLSearchParams)
            {
                const inj = new SimpleInjector();
                inj.register('auth', auth);
                if (!httpConfig.inject)
                    httpConfig.inject = [];
                inj.injectWithName(httpConfig.inject, (auth) =>
                {
                    switch (typeof options.body)
                    {
                        case 'string':
                            options.body = new URLSearchParams(options.body);
                        case 'object':
                            if (options.body === null)
                                options.body = auth;
                            else if (options.body instanceof URLSearchParams)
                                options.body = Object.assign(Object.fromEntries(options.body.entries()), auth);
                            else
                                Object.assign(options.body, auth);
                            break;
                        case 'undefined':
                            options.body = auth;
                            break;
                        default:
                            throw new Error('The body is not an object and cannot be merged with the authentication object');
                    }
                })(this);
            }
            break;
        default:
            throw new Error(`The body mode ${options.contentType} is not supported for this type of request`);
    }
})

authMiddleware.use(1000, async function (httpConfig, options, auth)
{
    const mode = httpConfig.mode as HttpConfiguration['auth']['mode'];
    if (typeof mode !== 'object')
        throw new Error('When reaching that step, the httpConfig is expected to be an object, but was ' + httpConfig.mode);

    if (!('type' in mode) || mode.type !== 'query' && mode.type !== 'header' && mode.type !== 'cookie')
        throw new Error('When reaching that step, the expected httpConfig mode type should be one of: cookie, query or header, but was ' + httpConfig.mode['type']);

    if (typeof auth !== 'string')
        throw new Error('When using ' + mode.type + ' mode, the authentication has to be a string')


    switch (mode.type)
    {
        case 'cookie':
            if (!options.headers)
                options.headers = {};
            if (!options.headers.cookie)
                options.headers.cookie = '';
            options.headers.cookie += encodeURIComponent(mode.name) + '=' + encodeURIComponent(auth);
            break;
        case 'query':
            options.queryString[mode.name] = auth;
            break;
        case 'header':
            if (!options.headers)
                options.headers = {};
            options.headers[mode.name] = auth;
            break;
    }
})

handlers.useProtocol('http', HttpClient.handler('http'));
handlers.useProtocol('https', HttpClient.handler('https'));

export interface HttpConfiguration extends ConfigurationWithAuth<HttpAuthConfiguration>
{
    method: string;
    route: string;
    contentType?: HttpOptions<unknown>['contentType'];
    type?: HttpOptions<unknown>['type'];
}

interface HttpAuthConfiguration extends Configuration
{
    required?: boolean;
    mode: 'basic' | 'body' | 'bearer' | {
        type: 'query' | 'header' | 'cookie', name: string
    }
}
