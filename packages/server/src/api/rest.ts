import { WorkerRouter, HttpRouter } from '../router'
import * as akala from '@akala/core';
import * as worker from '../worker-meta'
import * as master from '../master-meta'
import * as jsonrpcws from '@akala/json-rpc-ws'
import { RestConfig } from '@akala/core/dist/api/rest';
import { parse } from 'url';
import * as stream from 'stream';
var log = akala.log('akala:rest');

function buildParam(req: master.Request | worker.Request, config: RestConfig<any>)
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
            if (typeof (config.param) == 'string')
                return req.injector.resolve(config.param);
            let result: any = {};
            let url = parse(req.url, true);
            akala.each(config.param, function (value, key)
            {
                result[key] = req.injector.resolve(value as string);
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
                router[config.rest && config.rest.method || 'get'](config.rest.url, function (req: worker.Request | master.Request, res: worker.CallbackResponse | master.Response)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (!req.injector)
                    {
                        var requestInjector = new worker.WorkerInjectorImpl(req);
                        Object.defineProperty(req, 'injector', { value: requestInjector, enumerable: false, configurable: false, writable: false });
                        var callback: worker.Callback = <any>function callback(status, data?: jsonrpcws.PayloadDataType | string)
                        {
                            var response: worker.CallbackResponse;;
                            if (arguments.length == 0)
                                if (res instanceof Function)
                                {
                                    return Promise.resolve();
                                }
                                else
                                {
                                    arguments[arguments.length - 1]();
                                }


                            if (isNaN(Number(status)) || Array.isArray(status))
                            {
                                response = status;
                                if (typeof (data) == 'undefined')
                                {
                                    if (typeof (status) == 'undefined')
                                        response = { statusCode: 404, data: 'Not found' };
                                    else if (isNaN(Number(response.statusCode)) && !(response instanceof stream.Readable))
                                    {
                                        data = response as any;
                                        response = { statusCode: 200, data: data };
                                        status = null;
                                    }
                                    else
                                        data = undefined;
                                    status = null;
                                }
                            }
                            else
                                response = { statusCode: status, data: 'No data' };

                            response.statusCode = response.statusCode || 200;

                            if (!(data instanceof stream.Readable) && !Buffer.isBuffer(data) && typeof (data) !== 'string' && typeof data != 'number' && typeof (data) != 'undefined')
                            {
                                if (!response.headers)
                                    response.headers = {};
                                if (data instanceof Error)
                                {
                                    if (!response.headers['Content-Type'])
                                        response.headers['Content-Type'] = 'text/text';
                                    data = data.stack;
                                }
                                else
                                {
                                    if (!response.headers['Content-Type'])
                                        response.headers['Content-Type'] = 'application/json';
                                    data = JSON.stringify(data);
                                }
                            }
                            if (typeof (data) != 'undefined')
                                response.data = data;

                            if (response instanceof stream.Readable && res instanceof stream.Writable)
                                response.pipe(res);
                            else if (res instanceof Function)
                                Promise.resolve(response);
                            else
                            {
                                res.statusCode = response.statusCode;
                                res.statusMessage = response.statusMessage;
                                if (response.headers)
                                    akala.each(response.headers, (value, name) => res.setHeader(name as string, value));
                                res.end(response.data);
                            }
                        }

                        callback.redirect = function (url: string)
                        {
                            return callback({ status: 302, headers: { location: url } })
                        }

                        requestInjector.register('$callback', callback);
                    }

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
                router[config['rest'] && config['rest'].method || 'get'](config['rest'].url, function (req: worker.Request | master.Request, res: akala.NextFunction | master.Response)
                {
                    log('receiving ' + serverKey + ' with %o', req);
                    if (!req.injector)
                    {
                        var requestInjector = new worker.WorkerInjectorImpl(req);
                        Object.defineProperty(req, 'injector', { value: requestInjector, enumerable: false, configurable: false, writable: false });
                        var callback: worker.Callback = <any>function callback(status, data?: jsonrpcws.PayloadDataType | string)
                        {
                            var response: worker.CallbackResponse;;
                            if (arguments.length == 0)
                                if (res instanceof Function)
                                {
                                    return Promise.resolve();
                                }
                                else
                                {
                                    arguments[arguments.length - 1]();
                                }


                            if (isNaN(Number(status)) || Array.isArray(status))
                            {
                                response = status;
                                if (typeof (data) == 'undefined')
                                {
                                    if (typeof (status) == 'undefined')
                                        response = { statusCode: 404, data: 'Not found' };
                                    else if (isNaN(Number(response.statusCode)) && !(response instanceof stream.Readable))
                                    {
                                        data = response as any;
                                        response = { statusCode: 200, data: data };
                                        status = null;
                                    }
                                    else
                                        data = undefined;
                                    status = null;
                                }
                            }
                            else
                                response = { statusCode: status, data: 'No data' };

                            response.statusCode = response.statusCode || 200;

                            if (!(data instanceof stream.Readable) && !Buffer.isBuffer(data) && typeof (data) !== 'string' && typeof data != 'number' && typeof (data) != 'undefined')
                            {
                                if (!response.headers)
                                    response.headers = {};
                                if (data instanceof Error)
                                {
                                    if (!response.headers['Content-Type'])
                                        response.headers['Content-Type'] = 'text/text';
                                    data = data.stack;
                                }
                                else
                                {
                                    if (!response.headers['Content-Type'])
                                        response.headers['Content-Type'] = 'application/json';
                                    data = JSON.stringify(data);
                                }
                            }
                            if (typeof (data) != 'undefined')
                                response.data = data;

                            if (response instanceof stream.Readable && res instanceof stream.Writable)
                                response.pipe(res);
                            else if (res instanceof Function)
                                Promise.resolve(response);
                            else
                            {
                                res.statusCode = response.statusCode;
                                res.statusMessage = response.statusMessage;
                                if (response.headers)
                                    akala.each(response.headers, (value, name) => res.setHeader(name as string, value));
                                res.end(response.data);
                            }
                        }

                        callback.redirect = function (url: string)
                        {
                            return callback({ status: 302, headers: { location: url } })
                        }

                        requestInjector.register('$callback', callback);
                    }

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
