// export * from './sharedComponent/component';
// export * from './sharedComponent/jsonrpc';
// export * from './sharedComponent/service';
export * from './api'
import './translator';
export { router, wrouter, Request, Response, HttpRouter, CallbackResponse } from './router';
export * from './helpers/mkdirp';

export { Http, server, client } from '@akala/core';
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
    log,
    IFactory,
    Interpolate,
    NextFunction,
    Proxy,
    Api,
    DualApi,
    JsonRpcWs,
    Rest
} from '@akala/core';
import * as st from 'serve-static';
export { st as static };
