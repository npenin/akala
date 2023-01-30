import { Module } from './module';
import { onResolve } from './global-injector'
import * as jsonrpc from '@akala/json-rpc-ws'
export { Module };
export * from './promiseHelpers';
export * from './distinct';
export * as base64 from './base64';
export { each as eachAsync, NextFunction, map as mapAsync, AggregateErrors } from './eachAsync';
export { each, grep, Proxy, map } from './each';

export type Remote<T> = { [key in keyof T]: T[key] extends (...args) => infer X ? X extends Promise<infer Y> ? X : Promise<X> : (T[key] | undefined) }

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
export function noop() { }

export function module(name: string, ...dependencies: string[]): Module
export function module(name: string, ...dependencies: Module[]): Module
export function module(name: string, ...dependencies: (Module | string)[]): Module
{
    if (dependencies && dependencies.length)
        return new Module(name, dependencies.map(m => typeof (m) == 'string' ? module(m) : m));
    return new Module(name);
}

export function lazy<T>(factory: () => T)
{
    var instance: T;
    return function ()
    {
        return instance || (instance = factory());
    }
}

export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: unknown[]): string;
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export async function createSocket(namespace: string)
{
    const resolveUrl = await onResolve<(url: string) => string>('$resolveUrl');
    if (!resolveUrl)
        throw new Error('no url resolver could be found');
    return await new Promise<jsonrpc.SocketAdapter>((resolve, reject) =>
    {
        const socket = jsonrpc.ws.connect(resolveUrl(namespace));

        socket.once('open', function ()
        {
            resolve(socket);
        });

        socket.once('error', function (err)
        {
            reject(err);
        });
    });
}

