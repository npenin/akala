import "reflect-metadata";
import { SimpleInjector } from './simple-injector.js';
import { InjectedParameter } from "./shared.js";

export type PropertyInjection = ((i: SimpleInjector) => void);
export type ParameterInjection = ((i: SimpleInjector) => InjectedParameter<unknown>);

export const injectSymbol = Symbol('inject');
export const afterInjectSymbol = Symbol('after-inject');

export interface InjectableObject
{
    [injectSymbol]: ((i: SimpleInjector) => void)[];
}

/**
 * Decorator to mark class properties or constructor parameters for dependency injection.
 * 
 * @param name - Optional dependency name. If omitted, uses the property name as the dependency key.
 * @returns Decorator function to apply injection metadata.
 */
export function inject(name?: string)
{
    return function (target: object | (new (...args: unknown[]) => unknown), propertyKey: string, parameterIndex?: number)
    {
        if (typeof parameterIndex == 'number')
        {
            if (!name)
                throw new Error('name is required as parameter names are not available in reflection');
            const injections: { [key: string]: (PropertyInjection | ParameterInjection)[] } = Reflect.getOwnMetadata(injectSymbol, target) || { [propertyKey]: [] };
            if (!injections[propertyKey])
                injections[propertyKey] = [];
            injections[propertyKey].push(function (injector: SimpleInjector)
            {
                const resolved = injector.resolve(name);
                return { index: parameterIndex, value: resolved };
            });
            if (propertyKey)
                Reflect.defineMetadata(injectSymbol, injections[propertyKey], target[propertyKey]);
            Reflect.defineMetadata(injectSymbol, injections, target)
        }
        else
        {
            const injections: { [key: string]: (PropertyInjection | ParameterInjection)[] } = Reflect.getOwnMetadata(injectSymbol, target) || { [propertyKey]: [] };
            if (!injections[propertyKey])
                injections[propertyKey] = [];
            injections[propertyKey].push(function (injector: SimpleInjector)
            {
                this[propertyKey] = injector.resolve(name || propertyKey);
            });

            Reflect.defineMetadata(injectSymbol, injections, target)

        }
    }
}

/**
 * Processes dependency injection metadata for an object and its prototype chain.
 * 
 * @param {SimpleInjector} injector - The injector to resolve dependencies.
 * @param {object} obj - Target object to apply injections to.
 * @param {object} [prototype] - Optional prototype to traverse (used internally).
 */
export function applyInjector(injector: SimpleInjector, obj: object, prototype?: object)
{
    const injections: { [key: string]: (PropertyInjection | ParameterInjection)[] } = Reflect.getOwnMetadata(injectSymbol, prototype || obj);
    // if (injections && injections.length)
    //     injections.forEach(f => f(injector));

    if (prototype !== Object.prototype)
        applyInjector(injector, obj, Reflect.getPrototypeOf(prototype || obj));

    for (const property in injections)
    {
        if (property && property.length)
        {
            let descriptor = Reflect.getOwnPropertyDescriptor(obj, property);
            if (!descriptor && prototype)
            {
                descriptor = Reflect.getOwnPropertyDescriptor(prototype, property);
                if (descriptor && typeof descriptor.value !== 'function')
                    descriptor = null;
            }
            if (!descriptor)
            {
                let valueSet = false;
                let value: unknown;
                Reflect.defineProperty(obj, property, {
                    get()
                    {
                        if (valueSet)
                            return value;
                        injections[property].forEach(i => i.call(obj, injector));
                        return obj[property];
                    },
                    set(v)
                    {
                        value = v;
                        valueSet = true;
                    }
                })

            }
            else if (descriptor.value)
            {
                const oldFunction = descriptor.value;
                Object.defineProperty(obj, property, {
                    value: function injected(...args: unknown[]) 
                    {
                        return oldFunction.apply(this, SimpleInjector.mergeArrays(injections[property].map(p => (p as ParameterInjection)(injector)), ...args));
                    }
                })
            }
            else
            {
                injections[property].forEach(p => (p as PropertyInjection).call(obj, injector));
            }
        }
    }
}

/**
 * Decorator to make a class injectable with dependency resolution.
 * 
 * @template TInstance - Type of the class instance.
 * @template TClass - Type of the class constructor.
 * @param {TClass} ctor - Class constructor to wrap.
 * @param {SimpleInjector} injector - Optional injector instance (default uses constructor argument).
 * @returns {TClass} Injectable class with dependency injection setup.
 */
export function injectable<TInstance, TClass extends { new(...args: unknown[]): TInstance }>(ctor: TClass, injector?: SimpleInjector): TClass
{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    const result = class DynamicProxy extends ctor
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        constructor(...args: any[])
        {
            const injectionObj: { [key: string]: ParameterInjection[] } = Reflect.getOwnMetadata(injectSymbol, ctor);
            if (injectionObj)
                var injections = injectionObj['undefined'];
            if (!injector)
            {
                injector = args.shift();
                if ((!injector || !(injector instanceof SimpleInjector)) && injections && injections.length)
                    throw new Error(`No injector was provided while it is required to construct ${ctor}`)
                // if (injector)
                //     Reflect.defineMetadata(injectSymbol, injector, new.target);
            }
            let injected = injections && injections.map(f => f(injector)) || [];
            injected = injected.filter(p => typeof p.index == 'number');
            super(...SimpleInjector.mergeArrays(injected, injector, ...args))
            // Reflect.deleteMetadata(injectSymbol, new.target);
            // Object.setPrototypeOf(this, Object.create(ctor.prototype));
            // if (new.target == result)
            // {
            applyInjector(injector, this);
            if (typeof (this[afterInjectSymbol]) != 'undefined')
                this[afterInjectSymbol]();
            // }
        }
    }

    // Object.setPrototypeOf(result, Object.create(ctor.prototype));

    Object.assign(result, ctor);

    return result;
}

export type InjectableClass<T> = T & {
    new(injector: SimpleInjector): T;
};

/**
 * Creates a class decorator to apply an injector to a class.
 * 
 * @param {SimpleInjector} injector - Injector instance to bind to the class.
 * @returns {Function} Class decorator that configures the class for dependency injection.
 */
export function useInjector(injector: SimpleInjector)
{
    return function classInjectorDecorator<TClass extends { new(...args: unknown[]): object }>(ctor: TClass): TClass
    {
        return injectable(ctor, injector);
    };
}

/**
 * Extends a class with an injector for dependency resolution.
 * 
 * @template TClass - Type of the class to extend.
 * @param {SimpleInjector} injector - Injector instance to apply.
 * @param {TClass} constructor - Class to extend.
 * @returns {TClass} Extended class with injector configuration.
 */
export function extendInject<TClass extends { new(...args: unknown[]): object }>(injector: SimpleInjector, constructor: TClass): TClass
{
    return useInjector(injector)<TClass>(constructor);
}

/**
 * Reflection-based injector that resolves dependencies using metadata.
 * 
 * @extends SimpleInjector
 */
export class ReflectionInjector extends SimpleInjector
{
    /**
     * Creates a new ReflectionInjector instance.
     * 
     * @param {SimpleInjector} [parent] - Optional parent injector to delegate unresolved dependencies to.
     */
    constructor(protected parent?: SimpleInjector)
    {
        super(parent);
    }
}
