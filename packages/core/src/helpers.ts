import { Module } from './module.js';
export { Module };
export * from './promiseHelpers.js';
export * from './distinct.js';
export * as base64 from './base64.js';
export { each as eachAsync, NextFunction, map as mapAsync, AggregateErrors } from './eachAsync.js';
export { each, grep, Proxy, map } from './each.js';

export type Remote<T> = { [key in keyof T]: T[key] extends (...args) => infer X ? X extends Promise<unknown> ? X : Promise<X> : (T[key] | undefined) }
export type Serializable = string | number | string[] | number[] | boolean | boolean[] | SerializableObject | SerializableObject[];
export type SerializableObject = { [key: string]: Serializable };

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