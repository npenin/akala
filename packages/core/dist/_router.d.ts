import * as async from './eachAsync';
export interface routington<T extends Function> {
    define(path: string): Node<T>[];
    match(path: string): Match<T>;
}
export interface Node<T extends Function> {
    middleware: Middleware<T>;
    parent: Node<T>;
    children: Node<T>[];
    child: {
        [key: string]: Node<T>;
    };
}
export interface Match<T extends Function> {
    node: Node<T>;
    param: {
        [key: string]: string;
    };
}
export declare class Middleware<T extends Function> {
    protected next: async.NextFunction;
    constructor(next: async.NextFunction);
    static handleMessage<T extends Function>(handlers: T[], args: any[], customNext: async.NextFunction): void;
    private handlers;
    use(...handlers: T[]): this;
    handle(...args: any[]): void;
}
export declare class Router<T extends Function> {
    protected next: async.NextFunction;
    private pathExpression;
    constructor(next: async.NextFunction, pathExpression: string);
    private middleware;
    private getPath;
    private setPath;
    private router;
    use(path: string, ...handlers: Router<T>[]): any;
    use(path: string, ...handlers: T[]): any;
    use(...handlers: T[]): any;
    use(...handlers: Router<T>[]): any;
    route(path: string): void;
    handle(...args: any[]): void;
    handleRoute(...args: any[]): any;
}
export declare class Router1<T> extends Router<(arg1: T, next: async.NextFunction) => void> {
    constructor(next: async.NextFunction, pathExpression: string);
}
export declare class Router2<T, U> extends Router<(arg1: T, arg2: U, next: async.NextFunction) => void> {
    constructor(next: async.NextFunction, pathExpression: string);
}
