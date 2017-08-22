
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
export { eachAsync, each, grep, map, Translator, noop, Injector, injectWithName, injectNewWithName, inject, injectNew, register, factory, Promisify, module, isPromiseLike, service, IFactory, resolve, Deferred, NextFunction, log, extend, Interpolate, Proxy, Metadata, DualMetadata, when, registerFactory, inspect } from '@akala/core';
import * as st from 'serve-static';
export { st as static };
