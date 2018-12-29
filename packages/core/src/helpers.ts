import { Module } from './module';
import { register, resolve } from './injector'
import * as jsonrpc from '@akala/json-rpc-ws'
import { chain } from './chain'
export type Module = Module;
export * from './promiseHelpers';
export { each as eachAsync, NextFunction } from './eachAsync';
export { each, grep } from './each';
export * from './router';
import { debug as log } from 'debug';

export function noop() { };

export function extend<T, U>(target: T, other: U): T & U;
export function extend<T, U, V>(target: T, other1: U, other2: V): T & U & V;
export function extend<T, U, V, W>(target: T, other1: U, other2: V, other3: W): T & U & V & W;
export function extend<T, U, V, W, X>(target: T, other1: U, other2: V, other3: W, other43: X): T & U & V & W & X;
export function extend(target: any, ...args)
{
    args.forEach(function (arg)
    {
        if (typeof (arg) == 'object' && arg)
            Object.keys(arg).forEach(function (key)
            {
                var a = typeof (target[key]);
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

export function module(name: string, ...dependencies: string[])
{
    if (dependencies && dependencies.length)
        return new Module(name, dependencies);
    return new Module(name);
}

export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: any[]): string;
}


function createClient<TConnection extends jsonrpc.Connection>(namespace: string): PromiseLike<jsonrpc.Client<TConnection>>
{
    var client = jsonrpc.createClient<TConnection>();
    var resolveUrl: (url: string) => string = resolve('$resolveUrl');
    if (!resolveUrl)
        throw new Error('no url resolver could be found');
    return new Promise<jsonrpc.Client<TConnection>>((resolve, reject) =>
    {
        client.connect(resolveUrl(namespace), function ()
        {
            resolve(client);
        });
    });
}

register('$agent', chain(createClient, function (keys, key: string)
{
    keys.push(key);
    return keys;
}))
