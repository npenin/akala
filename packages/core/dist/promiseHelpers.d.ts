/// <reference types="node" />
import { EventEmitter } from 'events';
export declare function Promisify<T>(o: T): PromiseLike<T>;
export declare type ResolveHandler<T, TResult> = (value: T) => TResult | PromiseLike<TResult>;
export declare type RejectHandler<TResult> = (reason: any) => void | TResult | PromiseLike<TResult>;
export declare function isPromiseLike(o: any): o is PromiseLike<any>;
export declare enum PromiseStatus {
    Pending = 0,
    Resolved = 1,
    Rejected = 2,
}
export declare class Deferred<T> extends EventEmitter implements PromiseLike<T> {
    constructor();
    $$status: PromiseStatus;
    $$value: any;
    resolve(val: T | PromiseLike<T>): void;
    reject(reason: any): void;
    then<TResult>(onfulfilled?: ResolveHandler<T, TResult>, onrejected?: RejectHandler<TResult>): PromiseLike<TResult>;
}
