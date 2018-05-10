import * as jsonrpc from '@akala/json-rpc-ws'
import * as ws from 'ws'
import * as router from '../router'
import * as akala from '@akala/core';
import { Server } from '@akala/json-rpc-ws'
import * as worker from '../worker-meta'
import { RestConfig } from '@akala/core/dist/api/rest';
import { parse } from 'url';
var log = akala.log('akala:jsonrpc');

function buildParam(req: worker.Request, config: RestConfig<any>)
{
    switch (config.param)
    {
        case 'body':
            return req.body;
        case 'query':
            return parse(req.url, true).query;
        case 'route':
            return req.params;
        default:
            let result: any = {};
            let url = parse(req.url, true);
            akala.each(config.param, function (value, key)
            {
                switch (value)
                {
                    case 'body':
                        result[key] = req.body;
                        break;
                    case 'header':
                        result[key] = req.headers[key];
                        break;
                    case 'query':
                        result[key] = url.query[key];
                        break;
                    case 'route':
                        result[key] = req.params[key];
                        break;
                    default:
                        result[key] = req.injector.resolve(key);
                }
            })
            return result;
    }
}

export class Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>
    extends akala.Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    implements akala.IServerBuilder<string, TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
{
    constructor(api: akala.Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
    {
        super(api);
    }

    public createServer(path: string, serverImpl: TServerOneWay & TServerTwoWay)
    {
        var api = this.api;
        return akala.injectWithName(['$router'], function (router: router.HttpRouter)
        {
            router = router.use(path);

            log('creating server on ' + path);
            akala.each(api.serverOneWayConfig, function (config, serverKey)
            {
                router[config.rest && config.rest.method || 'get'](serverKey, function (req: worker.Request, res: Response)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (config.rest.inject)
                        var result = (<any>serverImpl[serverKey])(buildParam(req, config.rest));
                    else
                        result = (<any>serverImpl[serverKey])(req);
                    if (akala.isPromiseLike(result))
                        result.then(function (value)
                        {
                            log('replying with %o', value);
                            req.injector.resolve('$callback')(value);
                        }, function (reason)
                            {
                                req.injector.resolve('$callback')(500, reason);
                            });
                    else
                        req.injector.resolve('$callback')(result);
                })
            });

            akala.each(api.serverTwoWayConfig, function (config, serverKey)
            {
                router[config.rest && config.rest.method || 'get'](serverKey, function (req: worker.Request, res: worker.Callback)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (config.rest.inject)
                        var result = req.injector.injectWithName(config.rest.inject, serverImpl[serverKey] as any)
                    else
                        result = (<any>serverImpl[serverKey])(req, res);
                    if (akala.isPromiseLike(result))
                        result.then(function (value)
                        {
                            log('replying with %o', value);
                            req.injector.resolve('$callback')(value);
                        }, function (reason)
                            {
                                req.injector.resolve('$callback')(500, reason);
                            });
                    else
                        req.injector.resolve('$callback')(result);
                })
            });

            return <any>serverImpl;
        })();
    }
}

akala.module('$api').register('rest', Rest, true);
