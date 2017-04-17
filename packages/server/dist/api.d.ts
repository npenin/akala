import { NextFunction } from '@akala/core';
import { Request } from './router';
export declare function command($inject: string[], f: Function): (request: Request, next: NextFunction) => void;
export declare function registerCommandsIn(folder: string): void;
