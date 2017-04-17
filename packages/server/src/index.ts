
export * from './SharedComponent';
export * from './translator';
export { router, wrouter, Request, Response, HttpRouter } from './router';
export { Injector, injectWithName, injectNewWithName, inject, register, factory, Promisify, module, isPromiseLike, service, IFactory, Http, resolve, Deferred, NextFunction } from '@akala/core';
export * from './api';

import * as worker from './worker-meta'
export { worker };
export type resolve = worker.resolve;
import * as st from 'serve-static';
export { st as static };
