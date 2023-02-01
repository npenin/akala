import { Injector, HttpOptions, each, Http, defaultInjector, MiddlewarePromise, SerializableObject } from '@akala/core';
import * as pathRegexp from 'path-to-regexp';
import { CommandProcessor } from '../model/processor.js';
import { Command, Configuration } from '../metadata/index.js';
import { Container } from '../model/container.js';

export class HttpClient extends CommandProcessor
{
    public handle(origin: Container<unknown>, command: Command, param: { param: unknown[], [key: string]: unknown }): MiddlewarePromise
    {
        if (!command.config)
            throw new Error('no trigger configuration defined');

        const config = command.config.http as unknown as HttpConfiguration;
        if (!config)
            throw new Error('no http configuration specified');

        const injector = this.injector;
        return injector.injectWithNameAsync(['$http', '$resolveUrl'], async function (http: Http, resolveUrl: (url: string) => string)
        {
            const res = await http.call(HttpClient.buildCall(config, resolveUrl, ...param.param));
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

    public static buildCall(config: HttpConfiguration, resolveUrl: (s: string) => string, ...param: unknown[]): HttpOptions
    {
        let url = config.route;
        if (url[0] == '/')
            url = url.substr(1);
        let route: { [key: string]: unknown } | null = null;
        if (config.type == 'raw')
        {
            config = Object.assign({}, config);
            config.type = undefined;
        }
        const options: HttpOptions = { method: config.method, url: '', type: config.type };
        if (config.inject)
            each(config.inject, function (value, key)
            {
                switch (value)
                {
                    case 'body':
                        if (typeof (param[key]) == 'object')
                        {
                            options.contentType = options.type as HttpOptions['contentType'];
                            options.body = Object.assign(options.body || {}, param && param[key]);
                        }
                        else
                        {
                            options.contentType = options.type as HttpOptions['contentType'];
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
                                        options.contentType = options.type as HttpOptions['contentType'];
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
        return options;
    }

    private readonly injector: Injector;

    constructor(injector?: Injector)
    {
        super('http')

        this.injector = injector || defaultInjector;
    }
}

export interface HttpConfiguration extends Configuration
{
    method: string;
    route: string;
    type?: 'json' | 'xml' | 'text' | 'raw';
}