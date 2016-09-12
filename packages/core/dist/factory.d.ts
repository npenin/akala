export declare function factory(name: string, ...toInject: string[]): (target: Function) => void;
export interface IFactory<T> {
    build(): T;
}
