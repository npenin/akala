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

export function module(name: string, ...dependencies: string[])
{
    return new Module(name, dependencies);
}