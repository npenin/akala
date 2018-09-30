import { Http, HttpFormatterFactory, HttpOptions } from '../http'
import { Api, IServerProxyBuilder, IClientBuilder, IServerBuilder } from './base';
import { each } from '../each';
import { createServer } from 'https';
import { resolve } from '../injector';
import { module } from '../helpers';
import * as pathRegexp from 'path-to-regexp';


export interface RestConfig<T>
{
    method: string;
    url: string;
    param?: { [key in keyof T]: 'body' | 'query' | 'header' | 'route' | string } | 'body' | 'query' | 'route' | string;
    type?: 'json' | 'xml';
}

export class Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>
    implements IServerProxyBuilder<string, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
{
    constructor(public api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
    {

    }

    public static buildCall<T>(config: RestConfig<T>, baseURL: string | URL, param: T): HttpOptions
    {
        var url = config.url;
        if (url[0] == '/')
            url = url.substr(1);
        switch (config.param)
        {
            case 'body':
                return { method: config.method, url: new URL(url, baseURL).toString(), body: param, type: config.type || 'json' };
            case 'query':
                return { method: config.method, url: new URL(url, baseURL).toString(), queryString: param, type: config.type || 'json' };
            case 'route':
                return { method: config.method, url: new URL(pathRegexp.compile(url)(param), baseURL).toString(), type: config.type || 'json' };
            default:
                var route = null;
                var options: HttpOptions = { method: config.method, url: baseURL.toString(), type: config.type || 'json' };
                if (typeof (config.param) == 'string')
                    throw new Error(`${config.param} is not a valid value`);
                if (config.param !== null && typeof (config.param) !== 'undefined')
                    each(config.param, function (value, key)
                    {
                        switch (value)
                        {
                            case 'body':
                                if (typeof (param[key]) == 'object')
                                    options.body = Object.assign(options.body || {}, param[key]);
                                else
                                {
                                    if (!options.body)
                                        options.body = {};
                                    options.body[key] = param[key] as any;
                                }
                                break;
                            case 'header':
                                if (typeof (param[key]) == 'object')
                                    options.headers = Object.assign(options.headers || {}, param[key]);
                                else
                                {
                                    if (!options.headers)
                                        options.headers = {};
                                    options.headers[key as string] = param[key] as any;
                                }
                                break;
                            case 'query':
                                if (typeof (param[key]) == 'object')
                                    options.queryString = Object.assign(options.queryString || {}, param[key]);
                                else
                                {
                                    if (!options.queryString)
                                        options.queryString = {};
                                    options.queryString[key] = param[key];
                                }
                                break;
                            case 'route':
                                if (typeof (param[key]) == 'object')
                                    route = Object.assign(route || {}, param[key]);
                                else
                                {
                                    if (!route)
                                        route = {};
                                    route[key] = param[key];
                                }
                                break;

                        }
                        if (route)
                            options.url = new URL(pathRegexp.compile(url)(route), baseURL).toString()
                        else
                            options.url = new URL(url, baseURL).toString();
                    })
                return options;
        }
    }

    public createServerProxy(baseUrl: string): Partial<TServerOneWayProxy & TServerTwoWayProxy>
    {
        var client: Http = resolve('$http');
        var resolveUrl: (url: string) => string = resolve('$resolveUrl');
        baseUrl = resolveUrl(baseUrl);

        var proxy: Partial<TServerOneWayProxy & TServerTwoWayProxy> = {};
        each(this.api.serverTwoWayConfig, function (config, key)
        {
            if (config['rest'])
            {
                proxy[key] = function (param)
                {
                    return client.call(Rest.buildCall(config['rest'], baseUrl, param)).then((res) =>
                    {
                        switch (config['rest'].type)
                        {
                            case 'raw':
                                return res;
                            case 'text':
                                return res.text();
                            case 'json':
                            default:
                                return res.json();
                        }
                    });
                } as any;
            }
        });
        each(this.api.serverOneWayConfig, function (config, key)
        {
            if (config['rest'])
            {
                proxy[key] = function (param)
                {
                    return client.call(Rest.buildCall(config['rest'], baseUrl, param)).then((res) =>
                    {
                        switch (config['rest'].type)
                        {
                            case 'raw':
                                return res;
                            case 'text':
                                return res.text();
                            case 'json':
                            default:
                                return res.json();
                        }
                    };
                } as any;
            }
        });
        return proxy;
    }

    public createClient(baseUrl: string): (impl: TClientOneWay & TClientTwoWay) => Partial<TClientOneWay & TClientTwoWay> & { $proxy(): Partial<TServerOneWayProxy & TServerTwoWayProxy> }
    {
        return (impl) => Object.assign(impl, { $proxy: () => { return this.createServerProxy(baseUrl); } });
    }
}

module('$api').register('rest', Rest);