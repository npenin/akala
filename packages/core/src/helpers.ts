import { Module } from './module.js';
import { onResolve } from './global-injector.js'
import * as jsonrpc from '@akala/json-rpc-ws'
export { Module };
export * from './promiseHelpers.js';
export { each as eachAsync, NextFunction, map as mapAsync } from './eachAsync.js';
export { each, grep, Proxy, map } from './each.js';
import log from 'debug';

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-empty-function
export function noop() { }

export function extend<T, U>(target: T, other: U): T & U;
export function extend<T, U, V>(target: T, other1: U, other2: V): T & U & V;
export function extend<T, U, V, W>(target: T, other1: U, other2: V, other3: W): T & U & V & W;
export function extend<T, U, V, W, X>(target: T, other1: U, other2: V, other3: W, other43: X): T & U & V & W & X;
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function extend(target: any, ...args)
{
    args.forEach(function (arg)
    {
        if (typeof (arg) == 'object' && arg)
            Object.keys(arg).forEach(function (key)
            {
                switch (typeof (target[key]))
                {
                    case 'object':
                        extend(target[key], arg[key]);
                        break;
                    default:
                        target[key] = arg[key];
                        break;
                }
            });
    });
    return target;
}

export { log }

export function module(name: string, ...dependencies: string[]): Module
export function module(name: string, ...dependencies: Module[]): Module
export function module(name: string, ...dependencies: (Module | string)[]): Module
{
    if (dependencies && dependencies.length)
        return new Module(name, dependencies.map(m => typeof (m) == 'string' ? module(m) : m));
    return new Module(name);
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
