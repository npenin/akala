
// export * from './sharedComponent/component';
// export * from './sharedComponent/jsonrpc';
// export * from './sharedComponent/service';
export { createServerFromMeta, meta as MetaModule, createServerFromDualMeta } from './sharedComponent/metadata'
import './translator';
export { router, wrouter, Request, Response, HttpRouter, CallbackResponse } from './router';
export * from './api';
export * from './helpers/mkdirp';

export { Http } from './http';
import * as worker from './worker-meta'
export { worker };
import * as master from './master-meta';
export { master };
export type resolve = worker.resolve;
export
{
    eachAsync, each, grep, map, extend,
    Translator, Queue, noop,
    Injector, injectWithName, injectNewWithName, inject, injectNew, register, factory, registerFactory, inspect, resolve, service, injectWithNameAsync, resolveAsync, onResolve,
    Promisify, isPromiseLike, when, whenOrTimeout,
    module,
    log,
    IFactory,
    Interpolate,
    NextFunction,
    Proxy,
    Metadata,
    DualMetadata,
} from '@akala/core';

export { serveStatic as static } from 'serve-static';