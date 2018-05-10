import { Injector, injectWithName, NextFunction, log, isPromiseLike, module, Api } from '@akala/core';
import { Response, Methods, requestHandlerWithNext, errorHandlerWithNext, Router } from '../router';
import { WorkerInjector, Request, Callback } from '../worker-meta'
import * as jsonrpc from '@akala/json-rpc-ws'

import * as fs from 'fs';
import * as http from 'http';
import { JsonRpcWs } from './jsonrpc';
import { Rest } from './rest';


export var restapi = <Methods<apiHandler<Function>>>{};
var debug = log('akala:api');

['all'].concat(http.METHODS).forEach(function (method: keyof Methods<apiHandler<Function>>)
{
    method = <keyof Methods<apiHandler<Function>>>method.toLowerCase();
    restapi[method as any] = function <T extends Function>(path: string, $inject: string[], ...handlers: T[])
    {
        return injectWithName(['$router'], function (router: Router<requestHandlerWithNext, errorHandlerWithNext>)
        {
            var args: any[] = [path];
            args.concat(handlers);
            handlers.forEach(function (handler)
            {
                router[method](path, function (request: Request)
                {
                    var requestInjector = request.injector;
                    var result = requestInjector.injectWithName($inject, <any>handler)();
                    if (isPromiseLike(result))
                    {
                        result.then(function (r)
                        {
                            requestInjector.resolve('$callback')(200, r);
                        }, function (err)
                            {
                                requestInjector.resolve('$callback')(500, err);
                            });
                    }
                    else if (typeof result != 'undefined')
                        requestInjector.resolve('$callback')(200, result);
                });
            })
            return api;
        })(api);
    }
});

export type apiHandler<T> = (path: string, $inject: string[], ...handlers: T[]) => Methods<apiHandler<T>>;

export function command<T extends Function>($inject: string[], f: T)
{
    return function (request: Request, next: NextFunction)
    {
        var injector = request.injector;
        var callback = request.injector.resolve('$callback');
        if (request.params)
            for (var i in request.params)
                injector.register('param.' + i, request.params[i]);

        if (request.query)
            for (var i in request.query)
                injector.register('query.' + i, request.query[i]);

        if (request.body)
            injector.register('$body', request.body);

        injector.register('$next', next);
        var result = request.injector.injectWithName($inject, <any>f)();
        if (isPromiseLike(result))
        {
            result.then(function (r)
            {
                callback(200, r);
            }, function (err)
                {
                    callback(500, err);
                });
        }
        else if (typeof result != 'undefined')
            callback(200, result);
    }
}


export var api = {
    jsonrpcws<TConnection extends jsonrpc.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : JsonRpcWs<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (module('$api').resolve('jsonrpcws'))(api);
    },
    rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (module('$api').resolve('rest'))(api);
    }
}

export function registerCommandsIn(folder: string)
{
    fs.stat(folder, function (error, stats)
    {
        if (error)
        {
            console.error(error);
            return;
        }
        if (stats.isDirectory())
        {
            fs.readdir(folder, function (error, files)
            {
                if (error)
                {
                    console.error(error);
                    return;
                }
                var extensions = Object.keys(require.extensions);
                files.forEach(function (file)
                {
                    if (extensions.indexOf(file.substring(file.length - 3)) > -1)
                    {
                        debug('requiring ' + folder + '/' + file)
                        require(folder + '/' + file);
                    }
                })
            })
        }
    });
}