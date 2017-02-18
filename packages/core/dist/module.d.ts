import * as di from './injector';
export declare class Module extends di.Injector {
    name: string;
    dep: string[];
    constructor(name: string, dep: string[]);
    private emitter;
    private static o;
    static registerModule(m: Module): void;
    private starting;
    run(toInject: string[], f: Function): void;
    init(toInject: string[], f: Function): void;
    start(toInject?: string[], f?: Function): void;
    private internalStart(callback);
}
