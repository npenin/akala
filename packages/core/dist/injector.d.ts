export declare class Injector {
    private parent;
    constructor(parent?: Injector);
    inject<T extends Function>(a: T): (instance?: any) => any;
    resolve(param: string): any;
    inspect(): void;
    injectWithName(toInject: string[], a: Function): (instance?: any) => any;
    private injectables;
    register(name: string, value: any, override?: boolean): any;
    registerFactory(name: string, value: () => any, override?: boolean): () => any;
    registerDescriptor(name: string, value: PropertyDescriptor, override?: boolean): void;
}
export declare function resolve(name: string): any;
export declare function inspect(): void;
export declare function inject(a: Function): (instance?: any) => any;
export declare function injectWithName(toInject: string[], a: Function): (instance?: any) => any;
export declare function register(name: string, value: any, override?: boolean): any;
export declare function registerFactory(name: string, value: () => any, override?: boolean): () => any;
