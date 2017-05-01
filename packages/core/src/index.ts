export * from './injector';
export * from './factory';
export * from './web';
export * from './service';
export * from './binder';
export * from './parser';
import { Module } from './module';
export type Module = Module;
export * from './promiseHelpers';
export { any as eachAsync, NextFunction } from './eachAsync';
export * from './router';
import * as log from 'debug';

export function extend(target: any, ...args)
{
    args.forEach(function (arg)
    {
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