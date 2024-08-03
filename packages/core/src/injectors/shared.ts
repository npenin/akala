import { each, map } from "../each.js";
import { logger } from "../logger.js";
import { isPromiseLike } from "../promiseHelpers.js";
import { getParamNames } from "../reflect.js";

export type Injected<T> = (instance?: unknown) => T;
export type Injectable<T> = (...args: unknown[]) => T;
export type InjectableConstructor<T> = new (...args: unknown[]) => T;
export type InjectableWithTypedThis<T, U> = (this: U, ...args: unknown[]) => T;
export type InjectableAsync<T> = (...args: unknown[]) => PromiseLike<T>;
export type InjectableAsyncWithTypedThis<T, U> = (this: U, ...args: unknown[]) => PromiseLike<T>;
export type InjectedParameter<T> = { index: number, value: T };

export type InjectMap<T = object> = T extends object ? { [key in keyof T]: Resolvable<T[key]> } : never;

export type Resolvable<T = object> = string | symbol | InjectMap<T> | (string | symbol)[];

export const injectorLog = logger('akala:core:injector');

export function ctorToFunction<T extends unknown[], TResult>(ctor: new (...args: T) => TResult): (...parameters: T) => TResult 
{
    return (...parameters: T) =>
    {
        const args = [null];
        for (let i = 0; i < parameters.length; i++)
            args[i + 1] = parameters[i];
        return new ctor(...parameters);
    }
}


export abstract class Injector
{
    static applyCollectedMap<T>(param: InjectMap<T>, resolved: { [k: string | symbol]: any }): T
    {
        return map(param, (value, key) =>
        {
            if (typeof value == 'object')
                return Injector.applyCollectedMap<T[keyof T]>(value as any, resolved);
            return resolved[value as keyof typeof resolved];
        });
    }
    static collectMap(param: InjectMap): (string | symbol)[]
    {
        let result: (string | symbol)[] = [];
        each(param, value =>
        {
            if (typeof value == 'object')
                result = result.concat(Injector.collectMap(param));
            else
                result.push(value);
        })
        return result;
    }
    public static mergeArrays(resolvedArgs: InjectedParameter<unknown>[], ...otherArgs: unknown[])
    {
        const args = [];
        let unknownArgIndex = 0;
        for (const arg of resolvedArgs.sort((a, b) => a.index - b.index))
        {
            if (arg.index === args.length)
                args[args.length] = arg.value;
            else if (typeof (otherArgs[unknownArgIndex]) != 'undefined')
                args[args.length] = otherArgs[unknownArgIndex++];
        }

        return args.concat(otherArgs.slice(unknownArgIndex));
    }

    protected getArguments(toInject: (Resolvable)[]): InjectedParameter<unknown>[]
    {
        return toInject.map((p, i) => ({ index: i, value: this.resolve(p) }));
    }

    // abstract setInjectables(value: TypeMap): void;

    // abstract keys(): (keyof TypeMap)[];

    abstract onResolve<T = unknown>(name: Resolvable): PromiseLike<T>
    abstract onResolve<T = unknown>(name: Resolvable, handler: (value: T) => void): void;

    public inject<T>(a: Injectable<T>): Injected<T>
    public inject<T>(...a: (Resolvable)[]): (b: TypedPropertyDescriptor<Injectable<T>>) => void
    public inject<T>(a: Injectable<T> | Resolvable, ...b: (Resolvable)[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T>>) => void)
    public inject<T>(a: Injectable<T> | Resolvable, ...b: (Resolvable)[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T>>) => void)
    {
        if (typeof a == 'function')
            return this.injectWithName(a['$inject'] || getParamNames(a as Injectable<T>), a as Injectable<T>);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return function (c: TypedPropertyDescriptor<Injectable<T>>)
        {
            if (typeof b == 'undefined')
                b = [];
            b.unshift(a);
            const oldf = self.injectWithName(b, c.value);
            c.value = function (...args)
            {
                return oldf.apply(this, Array.from(args));
            }
        }
    }

    public injectAsync<T>(a: Injectable<T>): Injected<T>
    public injectAsync<T>(...a: (Resolvable)[]): Injectable<T>
    public injectAsync<T>(a: Injectable<T> | Resolvable, ...b: (Resolvable)[])
    {
        if (typeof a == 'function')
            return this.injectWithNameAsync(a['$inject'] || getParamNames(a as Injectable<T>), a as Injectable<T>)

        if (typeof b == 'undefined')
            b = [];
        b.unshift(a);

        return <U>(c: TypedPropertyDescriptor<InjectableAsync<U>>) =>
        {
            const f = c.value;
            c.value = function ()
            {
                return this.injectWithNameAsync(b, f);
            }
        }
    }
    public injectNew<T>(ctor: InjectableConstructor<T>)
    {
        return this.inject<T>(ctorToFunction(ctor));
    }

    abstract resolve<T>(param: Resolvable): T;

    public resolveAsync<T>(name: Resolvable): PromiseLike<T>
    {
        return this.onResolve(name);
    }

    abstract inspect(): void

    public injectNewWithName<T>(toInject: Resolvable[], ctor: InjectableConstructor<T>): Injected<T>
    {
        return this.injectWithName(toInject, ctorToFunction(ctor));
    }

    public async injectWithNameAsync<T>(toInject: (Resolvable)[], a: InjectableAsync<T> | Injectable<T>): Promise<T>
    {
        if (!toInject || toInject.length == 0)
            return Promise.resolve<T>(a());
        const paramNames = getParamNames(a);
        let wait = false;

        if (paramNames.length == toInject.length || paramNames.length == 0)
        {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                // eslint-disable-next-line @typescript-eslint/ban-types
                return await (a as Function).call(globalThis);
            else
            {
                const args = [];
                for (const param of toInject)
                {
                    args[args.length] = this.resolveAsync(param);
                    if (isPromiseLike(args[args.length - 1]))
                        wait = true;
                }
                if (wait)
                {
                    const args2 = await Promise.all(args.map(function (v)
                    {
                        if (isPromiseLike(v))
                            return v;
                        return Promise.resolve(v);
                    }));
                    return a(...args2);
                }
                else
                    return a(...args);
            }
        }
        else
            throw new Error('the number of arguments does not match the number of injected parameters');
    }

    public injectWithName<T>(toInject: Resolvable[], a: Injectable<T>): Injected<T>
    {
        if (toInject && toInject.length > 0)
        {
            const paramNames = <string[]>getParamNames(a);
            if (paramNames.length == toInject.length || paramNames.length == 0)
            {
                if (toInject.length == paramNames.length && paramNames.length == 0)
                    return <Injectable<T>>a;
            }
        }
        return (instance?: unknown, ...otherArgs: unknown[]) =>
        {
            return a.apply(instance, Injector.mergeArrays(this.getArguments(toInject), ...otherArgs));
        }
    }

    exec<T>(...toInject: (Resolvable)[])
    {
        return (f: Injectable<T>) =>
        {
            return this.injectWithName(toInject, f)(this);
        }
    }
}

export abstract class LocalInjector extends Injector
{
    constructor(protected parent?: Injector | null)
    {
        super();
    }

    abstract unregister(name: string | symbol): void;

    public register<T>(name: string | symbol, value: T, override?: boolean): T
    {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }

    public registerFactory(name: string, value: (() => unknown), override?: boolean): (() => unknown)
    {
        this.register(name + 'Factory', value, override);
        this.registerDescriptor(name, {
            get: function ()
            {
                return value();
            }, enumerable: true, configurable: true
        }, override);
        return value;
    }


    // public factory(name: keyof { [key in keyof TypeMap]: TypeMap[key] extends (() => unknown) ? TypeMap[key] : never }, override?: boolean)
    public factory(name: string, override?: boolean): (fact: (() => unknown)) => void
    {
        return (fact: (() => unknown)) =>
        {
            this.registerFactory(name, fact, override);
        }
    }

    public service(name: string | symbol, ...toInject: Resolvable[])
    public service(name: string | symbol, override?: boolean, ...toInject: Resolvable[])
    public service(name: string | symbol, override?: boolean | Resolvable, ...toInject: Resolvable[])
    {
        let singleton;

        if (typeof toInject == 'undefined')
            toInject = [];

        if (typeof override == 'string')
        {
            toInject.unshift(override)
            override = false;
        }

        return <T>(fact: new (...args: unknown[]) => T) =>
        {
            this.registerDescriptor(name, {
                get: () =>
                {
                    if (singleton)
                        return singleton;
                    return singleton = this.injectNewWithName(toInject, fact)();
                }
            })
        }
    }


    abstract registerDescriptor(name: string | symbol, value: PropertyDescriptor, override?: boolean): void
}