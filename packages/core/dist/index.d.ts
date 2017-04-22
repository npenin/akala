export * from './injector';
export * from './factory';
export * from './web';
export * from './service';
export * from './binder';
export * from './parser';
import { Module } from './module';
export declare type Module = Module;
export * from './promiseHelpers';
export { any as eachAsync, NextFunction } from './eachAsync';
export * from './router';
export declare function module(name: string, ...dependencies: string[]): Module;
export interface Translator {
    (key: string): string;
    (format: string, ...parameters: any[]): string;
}
