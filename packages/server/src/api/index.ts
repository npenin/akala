import * as akala from '@akala/core';
import { Methods, requestHandlerWithNext, errorHandlerWithNext, Router } from '../router';
import { Request } from '../worker-meta'
import * as jsonrpc from '@akala/json-rpc-ws'

import * as fs from 'fs';
import * as http from 'http';
import './jsonrpc';
import './rest';
import { JsonRpcWs, createServerWorker as internalCreateServerWorker } from './jsonrpc';
import { Rest } from './rest';


export var restapi = <Methods<apiHandler<Function>>>{};
var debug = akala.log('akala:api');

['all'].concat(http.METHODS).forEach(function (method: keyof Methods<apiHandler<Function>>)
{
    method = <keyof Methods<apiHandler<Function>>>method.toLowerCase();
    restapi[method as any] = function <T extends Function>(path: string, $inject: string[], ...handlers: T[])
    {
        return akala.injectWithName(['$router'], function (router: Router<requestHandlerWithNext, errorHandlerWithNext>)
        {
            var args: any[] = [path];
            args.concat(handlers);
            handlers.forEach(function (handler)
            {
                router[method](path, function (request: Request)
                {
                    var requestInjector = request.injector;
                    var result: any = requestInjector.injectWithName($inject, <any>handler)();
                    if (akala.isPromiseLike(result))
                    {
                        result.then(function (value: any)
                        {
                            if (value && value.statusCode)
                                requestInjector.resolve('$callback')(value);
                            else
                                requestInjector.resolve('$callback')(200, value);
                        }, function (err)
                        {
                            requestInjector.resolve('$callback')(500, err);
                        });
                    }
                    else if (typeof result != 'undefined')
                        if (result && result.statusCode)
                            requestInjector.resolve('$callback')(result);
                        else
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
    return function (request: Request, next: akala.NextFunction)
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
        if (akala.isPromiseLike(result))
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

export namespace api
{
    export function jsonrpcws<TConnection extends akala.Connection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: akala.Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : JsonRpcWs<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (akala.module('$api').resolve('jsonrpcws'))(api);
    }
    export function rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy extends TServerOneWay, TServerTwoWayProxy extends TServerTwoWay, TClientOneWayProxy extends TClientOneWay, TClientTwoWayProxy extends TClientTwoWay>(api: akala.Api<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>)
        : Rest<TConnection, TServerOneWay, TServerTwoWay, TClientOneWay, TClientTwoWay, TServerOneWayProxy, TServerTwoWayProxy, TClientOneWayProxy, TClientTwoWayProxy>
    {
        return new (akala.module('$api').resolve('rest'))(api);
    }

    export var buildServer = akala.buildServer;
    export var buildClient = akala.buildClient;
    export var server = akala.server;
    export var client = akala.client;

    export var createServerWorker = internalCreateServerWorker;

    export type ServerWithoutProxy<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.ServerWithoutProxy<T>;
    export type ClientWithoutProxy<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.ClientWithoutProxy<T>;
    export type ServerProxy<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.ServerProxy<T>;
    export type Server<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.Server<T>;
    export type ClientProxy<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.ClientProxy<T>;
    export type Client<T extends akala.Api<any, any, any, any, any, any, any, any, any>> = akala.api.Client<T>;
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