import { Injector, injectWithName, NextFunction } from '@akala/core';
import { Request, Response, Methods, httpHandlerWithNext, Router } from './router';
import { WorkerInjector } from './worker-meta'

import * as fs from 'fs';
import * as http from 'http';


export var api = <Methods<apiHandler<Function>>>{};

['all'].concat(http.METHODS).forEach(function (method: keyof Methods<apiHandler<Function>>)
{
    method = <keyof Methods<apiHandler<Function>>>method.toLowerCase();
    api[method] = function <T extends Function>(path: string, $inject: string[], ...handlers: T[])
    {
        return injectWithName(['$router'], function (router: Router<httpHandlerWithNext>)
        {
            var args: any[] = [path];
            args.concat(handlers);
            handlers.forEach(function (handler)
            {
                router[method](path, function (request: Request)
                {
                    var requestInjector = request.injector;
                    if (request.params)
                        for (var i in request.params)
                            requestInjector.register('param.' + i, request.params[i], true);
                    if (request.query)
                        for (var i in request.query)
                            requestInjector.register('query.' + i, request.query[i], true);

                    requestInjector.injectWithName($inject, handler)();
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
        var injectable = injector.injectWithName($inject, f);
        injectable(this);
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
                        require(folder + '/' + file);
                })
            })
        }
    });
}