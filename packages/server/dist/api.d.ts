import { NextFunction } from '@akala/core';
import { Request, Methods } from './router';
export declare var api: Methods<apiHandler<Function>>;
export declare type apiHandler<T> = (path: string, $inject: string[], ...handlers: T[]) => Methods<apiHandler<T>>;
export declare function command<T extends Function>($inject: string[], f: T): (request: Request, next: NextFunction) => void;
export declare function registerCommandsIn(folder: string): void;
