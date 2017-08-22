import { Module } from './module';
export type Module = Module;
export * from './promiseHelpers';
export { each as eachAsync, NextFunction } from './eachAsync';
export { each, grep } from './each';
export * from './router';
import * as log from 'debug';

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
    return new Module(name, dependencies);
}

export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: any[]): string;
}