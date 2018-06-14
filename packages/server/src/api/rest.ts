import { WorkerRouter, HttpRouter } from '../router'
import * as akala from '@akala/core';
import * as worker from '../worker-meta'
import { RestConfig } from '@akala/core/dist/api/rest';
import { parse } from 'url';
var log = akala.log('akala:rest');

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
                result[key] = req.injector.resolve(key);
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
        return akala.injectWithName(['$router'], function (mainRouter: HttpRouter | WorkerRouter)
        {
            var router: HttpRouter | WorkerRouter;
            if (mainRouter instanceof WorkerRouter)
            {
                router = new WorkerRouter();
                mainRouter = mainRouter.use(path, router.router);
            }
            else
            {
                router = new HttpRouter();
                mainRouter = mainRouter.use(path, router.router);
            }

            log('creating server on ' + path);
            akala.each(api.serverOneWayConfig, function (config: { rest?: RestConfig<any> }, serverKey)
            {
                if (!config.rest)
                    return;
                router[config.rest && config.rest.method || 'get'](config.rest.url, function (req: worker.Request, res: Response)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (config.rest.param)
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
                if (!config['rest'])
                    return;
                router[config['rest'] && config['rest'].method || 'get'](config['rest'].url, function (req: worker.Request, res: worker.Callback)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (config['rest'].param)
                        var result = (<any>serverImpl[serverKey])(buildParam(req, config['rest']));
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

            return <any>serverImpl;
        })();
    }
}

akala.module('$api').register('rest', Rest, true);
