import { each, map } from "../each.js";
import { logger } from "../logger.js";
import { isPromiseLike } from "../promiseHelpers.js";
import { getParamNames } from "../reflect.js";

/**
 * Type representing a function that returns an injected value.
 * @template T - The type of the injected value.
 * @param instance - Optional instance context for the injected value.
 * @returns The injected value of type T.
 */
export type Injected<T> = (instance?: unknown) => T;

/**
 * Type representing an injectable function.
 * @template T - The return type of the function.
 * @template TArgs - The argument types of the function.
 */
export type Injectable<T, TArgs extends unknown[]> = (...args: TArgs) => T;

/**
 * Type representing an injectable constructor.
 * @template T - The instance type created by the constructor.
 * @template TArgs - The argument types passed to the constructor.
 */
export type InjectableConstructor<T, TArgs extends unknown[]> = new (...args: TArgs) => T;

/**
 * Type representing an injectable function with a typed 'this' context.
 * @template T - The return type of the function.
 * @template U - The type of the 'this' context.
 * @template TArgs - The argument types of the function.
 */
export type InjectableWithTypedThis<T, U, TArgs extends unknown[]> = (this: U, ...args: TArgs) => T;

/**
 * Type representing an injectable asynchronous function.
 * @template T - The resolved type of the promise.
 * @template TArgs - The argument types of the function.
 */
export type InjectableAsync<T, TArgs extends unknown[]> = (...args: TArgs) => PromiseLike<T>;

/**
 * Type representing an injectable asynchronous function with a typed 'this' context.
 * @template T - The resolved type of the promise.
 * @template U - The type of the 'this' context.
 * @template TArgs - The argument types of the function.
 */
export type InjectableAsyncWithTypedThis<T, U, TArgs extends unknown[]> = (this: U, ...args: TArgs) => PromiseLike<T>;

/**
 * Type representing a parameter with its index in the argument list.
 * @template T - The type of the parameter value.
 */
export type InjectedParameter<T> = { index: number, value: T };

/**
 * Type representing a parameter map for dependency injection.
 * @template T - The type of the object being mapped.
 */
export type InjectMap<T = object> = T extends object ? { [key in keyof T]: Resolvable<T[key]> } : never;

/**
 * Type representing a resolvable parameter value.
 * @template T - The type of the resolved value.
 */
export type Resolvable<T = object> = string | symbol | InjectMap<T> | (string | symbol)[];

export const injectorLog = logger('akala:core:injector');

/**
 * Converts a constructor to a function that creates new instances.
 * @template T - The parameter types of the constructor.
 * @template TResult - The instance type created by the constructor.
 * @param {new (...args: T) => TResult} ctor - The constructor to convert.
 * @returns {(...parameters: T) => TResult} A function that creates new instances of the constructor.
 */
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
    /**
     * Applies a collected map to resolved values.
     * @param {InjectMap<T>} param - The parameter map.
     * @param {{ [k: string | symbol]: any }} resolved - The resolved values.
     * @returns {T} The applied map.
     */
    static applyCollectedMap<T>(param: InjectMap<T>, resolved: { [k: string | symbol]: any }): T
    {
        return map(param, (value, key) =>
        {
            if (typeof value == 'object')
                return Injector.applyCollectedMap<T[keyof T]>(value as any, resolved);
            return resolved[value as keyof typeof resolved];
        });
    }

    /**
     * Collects a map of parameters.
     * @param {InjectMap} param - The parameter map.
     * @returns {(string | symbol)[]} The collected map.
     */
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

    /**
     * Merges arrays of resolved arguments and other arguments.
     * @param {InjectedParameter<unknown>[]} resolvedArgs - The resolved arguments.
     * @param {...unknown[]} otherArgs - The other arguments.
     * @returns {unknown[]} The merged array.
     */
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

    /**
     * Gets the arguments to inject.
     * @param {(Resolvable)[]} toInject - The resolvable parameters to inject.
     * @returns {InjectedParameter<unknown>[]} The injected parameters.
     */
    protected getArguments(toInject: (Resolvable)[]): InjectedParameter<unknown>[]
    {
        return toInject.map((p, i) => ({ index: i, value: this.resolve(p) }));
    }

    // abstract setInjectables(value: TypeMap): void;

    // abstract keys(): (keyof TypeMap)[];

    /**
     * Resolves a parameter asynchronously and returns a promise.
     * @param name - The name of the parameter to resolve.
     * @returns A promise resolving to the resolved value.
     */
    abstract onResolve<T = unknown>(name: Resolvable): PromiseLike<T>;

    /**
     * Resolves a parameter asynchronously and invokes a handler with the result.
     * @param name - The name of the parameter to resolve.
     * @param handler - Callback to execute with the resolved value.
     */
    abstract onResolve<T = unknown>(name: Resolvable, handler: (value: T) => void): void;

    /**
     * Injects a function or property.
     * @param {Injectable<T, TArgs> | Resolvable} a - The function or resolvable parameter.
     * @param {...Resolvable[]} b - Additional resolvable parameters.
     * @returns {Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T, TArgs>>) => void)} The injected function or property.
     */
    public inject<T, TArgs extends unknown[]>(a: Injectable<T, TArgs>): Injected<T>
    public inject<T, TArgs extends unknown[]>(...a: (Resolvable)[]): (b: TypedPropertyDescriptor<Injectable<T, TArgs>>) => void
    public inject<T, TArgs extends unknown[]>(a: Injectable<T, TArgs> | Resolvable, ...b: (Resolvable)[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T, TArgs>>) => void)
    public inject<T, TArgs extends unknown[]>(a: Injectable<T, TArgs> | Resolvable, ...b: (Resolvable)[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T, TArgs>>) => void)
    {
        if (typeof a == 'function')
            return this.injectWithName(a['$inject'] || getParamNames(a as Injectable<T, TArgs>), a as Injectable<T, TArgs>);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return function (c: TypedPropertyDescriptor<Injectable<T, TArgs>>)
        {
            if (typeof b == 'undefined')
                b = [];
            b.unshift(a);
            const oldf = self.injectWithName(b, c.value);
            c.value = function (...args: TArgs)
            {
                return oldf.apply(this, Array.from(args));
            } as Injectable<T, TArgs>
        }
    }

    /**
     * Injects an asynchronous function or property.
     * @param {Injectable<T, TArgs> | Resolvable} a - The function or resolvable parameter.
     * @param {...Resolvable[]} b - Additional resolvable parameters.
     * @returns {Injected<T> | ((b: TypedPropertyDescriptor<InjectableAsync<U, TArgs>>) => void)} The injected function or property.
     */
    public injectAsync<T, TArgs extends unknown[]>(a: Injectable<T, TArgs>): Injected<T>
    public injectAsync<T, TArgs extends unknown[]>(...a: (Resolvable)[]): Injectable<T, TArgs>
    public injectAsync<T, TArgs extends unknown[]>(a: Injectable<T, TArgs> | Resolvable, ...b: (Resolvable)[])
    {
        if (typeof a == 'function')
            return this.injectWithNameAsync(a['$inject'] || getParamNames(a as Injectable<T, TArgs>), a as Injectable<T, TArgs>)

        if (typeof b == 'undefined')
            b = [];
        b.unshift(a);

        return <U>(c: TypedPropertyDescriptor<InjectableAsync<U, TArgs>>) =>
        {
            const f = c.value;
            c.value = function ()
            {
                return this.injectWithNameAsync(b, f);
            }
        }
    }

    /**
     * Injects a new instance of a constructor.
     * @param {InjectableConstructor<T, TArgs>} ctor - The constructor to inject.
     * @returns {Injected<T>} The injected instance.
     */
    public injectNew<T, TArgs extends unknown[]>(ctor: InjectableConstructor<T, TArgs>)
    {
        return this.inject(ctorToFunction(ctor));
    }

    /**
     * Resolves a parameter.
     * @param {Resolvable} param - The parameter to resolve.
     * @returns {T} The resolved parameter.
     */
    abstract resolve<T>(param: Resolvable): T;

    /**
     * Resolves a parameter asynchronously.
     * @param {Resolvable} name - The name of the parameter to resolve.
     * @returns {PromiseLike<T>} The resolved parameter.
     */
    public resolveAsync<T>(name: Resolvable): PromiseLike<T>
    {
        return this.onResolve(name);
    }

    /**
     * Inspects the injector.
     */
    abstract inspect(): void

    /**
     * Injects a new instance of a constructor with specified parameters.
     * @param {Resolvable[]} toInject - The parameters to inject.
     * @param {InjectableConstructor<T, TArgs>} ctor - The constructor to inject.
     * @returns {Injected<T>} The injected instance.
     */
    public injectNewWithName<T, TArgs extends unknown[]>(toInject: Resolvable[], ctor: InjectableConstructor<T, TArgs>): Injected<T>
    {
        return this.injectWithName(toInject, ctorToFunction(ctor));
    }

    /**
     * Injects an asynchronous function with specified parameters.
     * @param {Resolvable[]} toInject - The parameters to inject.
     * @param {InjectableAsync<T, TArgs> | Injectable<T, TArgs>} a - The function to inject.
     * @returns {Promise<T>} The injected function.
     */
    public async injectWithNameAsync<T, TArgs extends unknown[]>(toInject: (Resolvable)[], a: InjectableAsync<T, TArgs> | Injectable<T, TArgs>): Promise<T>
    {
        if (!toInject || toInject.length == 0)
            return Promise.resolve<T>((a as Injectable<T, []>)());
        const paramNames = getParamNames(a);
        let wait = false;

        if (paramNames.length == toInject.length || paramNames.length == 0)
        {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                // eslint-disable-next-line @typescript-eslint/ban-types
                return await (a as Function).call(globalThis);
            else
            {
                const args = [] as TArgs;
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
                    })) as TArgs;
                    return a(...args2);
                }
                else
                    return a(...args);
            }
        }
        else
            throw new Error('the number of arguments does not match the number of injected parameters');
    }

    /**
     * Injects a function with specified parameters.
     * @param {Resolvable[]} toInject - The parameters to inject.
     * @param {Injectable<T, TArgs>} a - The function to inject.
     * @returns {Injected<T>} The injected function.
     */
    public injectWithName<T, TArgs extends unknown[]>(toInject: Resolvable[], a: Injectable<T, TArgs>): Injected<T>
    {
        if (toInject && toInject.length > 0)
        {
            const paramNames = <string[]>getParamNames(a);
            if (paramNames.length == toInject.length || paramNames.length == 0)
            {
                if (toInject.length == paramNames.length && paramNames.length == 0)
                    return <Injectable<T, []>>a;
            }
        }
        return (instance?: unknown, ...otherArgs: unknown[]) =>
        {
            return a.apply(instance, Injector.mergeArrays(this.getArguments(toInject), ...otherArgs));
        }
    }

    /**
     * Executes a function with specified parameters.
     * @param {...Resolvable[]} toInject - The parameters to inject.
     * @returns {(f: Injectable<T, TArgs>) => T} The executed function.
     */
    exec<T, TArgs extends unknown[]>(...toInject: (Resolvable)[])
    {
        return (f: Injectable<T, TArgs>) =>
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

    /**
     * Unregisters a parameter.
     * @param {string | symbol} name - The name of the parameter to unregister.
     */
    abstract unregister(name: string | symbol): void;

    /**
     * Registers a parameter with a value.
     * @param {string | symbol} name - The name of the parameter to register.
     * @param {T} value - The value to register.
     * @param {boolean} [override] - Whether to override the existing value.
     * @returns {T} The registered value.
     */
    public register<T>(name: string | symbol, value: T, override?: boolean): T
    {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }

    /**
     * Registers a factory function.
     * @param {string} name - The name of the factory.
     * @param {(() => unknown)} value - The factory function.
     * @param {boolean} [override] - Whether to override the existing value.
     * @returns {(() => unknown)} The registered factory function.
     */
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

    /**
     * Creates a factory function.
     * @param {string} name - The name of the factory.
     * @param {boolean} [override] - Whether to override the existing value.
     * @returns {(fact: (() => unknown)) => void} The factory function.
     */
    public factory(name: string, override?: boolean): (fact: (() => unknown)) => void
    {
        return (fact: (() => unknown)) =>
        {
            this.registerFactory(name, fact, override);
        }
    }

    /**
     * Registers a service.
     * @param {string | symbol} name - The name of the service.
     * @param {...Resolvable[]} toInject - The parameters to inject.
     */
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

    /**
     * Registers a descriptor.
     * @param {string | symbol} name - The name of the descriptor.
     * @param {PropertyDescriptor} value - The descriptor value.
     * @param {boolean} [override] - Whether to override the existing value.
     */
    abstract registerDescriptor(name: string | symbol, value: PropertyDescriptor, override?: boolean): void
}
