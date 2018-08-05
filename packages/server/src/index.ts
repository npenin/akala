// export * from './sharedComponent/component';
// export * from './sharedComponent/jsonrpc';
// export * from './sharedComponent/service';
export * from './api'
import './translator';
export { router, wrouter, Request, Response, HttpRouter, CallbackResponse } from './router';
export * from './helpers/mkdirp';

import './http'
export * from './http'
import * as worker from './worker-meta'
export { worker };
import * as master from './master-meta';
export { master };
export type resolve = worker.resolve;
export
{
    eachAsync, each, grep, map, extend,
    chain,
    Translator, Queue, noop,
    Injector, injectWithName, injectNewWithName, inject, injectNew, register, factory, registerFactory, inspect, resolve, service, injectWithNameAsync, resolveAsync, onResolve,
    Promisify, isPromiseLike, when, whenOrTimeout,
    module,
    IFactory,
    Interpolate,
    NextFunction,
    Proxy,
    Api,
    DualApi,
    JsonRpcWs,
    Rest,
    introspect,
    server, client, buildServer, buildClient
} from '@akala/core';
import * as st from 'serve-static';
export { st as static };

import { log as corelog } from '@akala/core';
import * as cluster from 'cluster';
import { isError } from 'util';

let customOutputs = ['error', 'warn', 'verbose', 'debug', 'info']

export interface Logger
{
    error?: corelog.IDebugger,
    warn?: corelog.IDebugger,
    verbose?: corelog.IDebugger,
    debug?: corelog.IDebugger,
    info?: corelog.IDebugger,
    [key: string]: corelog.IDebugger
}

export var logger: Logger & ((rootNamespace: string) => Logger) = <any>new Proxy(function (rootNamespace: string): Logger
{
    return new Proxy({}, {
        get: function (target, prop)
        {
            if (!Reflect.has(target, prop) && typeof (prop) == 'string')
                target[prop] = log(prop + ':' + rootNamespace);
            return Reflect.get(target, prop);
        }
    })
}, {
        get: function (target, prop)
        {
            if (!Reflect.has(target, prop) && typeof (prop) == 'string')
                target[prop] = log(prop);
            return Reflect.get(target, prop);
        }
    });

export function log(namespace: string)
{
    if (!cluster.isMaster)
    {
        var customOutput = customOutputs.find(o => namespace.startsWith(o + ':'));
        if (customOutput)
            namespace = namespace.substring((customOutput + ':').length);

        customOutput = customOutput || customOutputs.find(o => namespace == o);

        var moduleNamespace = process.argv[2].replace(/[@\/]/g, ':');
        if (moduleNamespace[0] == ':')
            moduleNamespace = moduleNamespace.substring(1);
        if (customOutput)
        {
            if (namespace == moduleNamespace || customOutput == namespace)
                namespace = moduleNamespace = customOutput + ':' + moduleNamespace;
            else
                moduleNamespace = customOutput + ':' + moduleNamespace;
        }
        if (!namespace.startsWith(moduleNamespace))
            namespace = moduleNamespace + ':' + namespace;
    }
    return corelog(namespace);
}