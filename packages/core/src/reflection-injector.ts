import "reflect-metadata";
import { Injector, InjectedParameter, Injected } from './injector.js';

export type PropertyInjection = ((i: Injector) => void);
export type ParameterInjection = ((i: Injector) => InjectedParameter<unknown>);

export const injectSymbol = Symbol('inject');
export const injectorSymbol = Symbol('injector');
export const afterInjectSymbol = Symbol('after-inject');

export interface InjectableOjbect
{
    [injectSymbol]: ((i: Injector) => void)[];
}

export function injectField(name?: string)
{
    return function (target: undefined, context: ClassFieldDecoratorContext)
    {
        const injections: { [key: string | symbol]: (PropertyInjection)[] } = Reflect.getOwnMetadata(injectSymbol, this) || { [context.name]: [] };
        if (!injections[context.name])
        {
            injections[context.name] = [];
            Reflect.defineMetadata(injectSymbol, injections, this)
        }

        injections[context.name].push(function (injector: Injector)
        {
            context.access.set(this, injector.resolve(name as string || context.name));
        });

    }
}

export function injectClassMethod(name: string[])
{
    return function <T, U extends unknown[]>(target: ((...args: U) => T), context: ClassMethodDecoratorContext)
    {
        let cache: Injected<T, unknown[]>;
        return function (...args: unknown[]): T
        {
            const injector: Injector = Reflect.getOwnMetadata(injectorSymbol, this)
            if (!cache)
                cache = injector.injectWithName(name, target);
            return cache(this, ...args);
        }
    }
}

export function injectClass(name: string[])
{
    return function <T, U extends unknown[]>(target: (new (...args: U) => T), context: ClassDecoratorContext<(new (...args: U) => T)>)
    {
        return injectable(target);
    }
}

export type ClassDecorator = <T, This, U extends unknown[]>(target: (new (...args: U) => T), context: ClassDecoratorContext<typeof target>) => (new (...args: U) => T) | void
export type ClassMethodDecorator = <T, This, U extends unknown[]>(target: ((this: This, ...args: U) => T), context: ClassMethodDecoratorContext<This, typeof target>) => ((...args: U) => T) | void
export type ClassFieldDecorator = <This>(target: undefined, context: ClassFieldDecoratorContext<This>) => ((this: This) => void) | void

export interface Decorator
{
    <T, This, U extends unknown[]>(target: (new (...args: U) => T), context: ClassDecoratorContext<typeof target>): (new (...args: U) => T) | void
    <T, This, U extends unknown[]>(target: ((this: This, ...args: U) => T), context: ClassMethodDecoratorContext<This, typeof target>): ((...args: U) => T) | void
    <T, This>(target: undefined, context: ClassFieldDecoratorContext<This, T>): ((this: This, value: T) => T) | void
}

export function inject(name?: string | string[]): Decorator
{
    return function <T, This, U extends unknown[]>(target: undefined | (new (...args: U) => T) | ((...args: U) => T), context: ClassFieldDecoratorContext<This> | ClassDecoratorContext<(new (...args: U) => T)> | ClassMethodDecoratorContext<This, (...args: U) => T>)
    {
        // if (typeof parameterIndex == 'number')
        // {
        //     if (!name)
        //         throw new Error('name is required as parameter names are not available in reflection');
        //     const injections: { [key: string]: (PropertyInjection | ParameterInjection)[] } = Reflect.getOwnMetadata(injectSymbol, target) || { [propertyKey]: [] };
        //     if (!injections[propertyKey])
        //         injections[propertyKey] = [];
        //     injections[propertyKey].push(function (injector: Injector)
        //     {
        //         const resolved = injector.resolve(name);
        //         return { index: parameterIndex, value: resolved };
        //     });
        //     if (propertyKey)
        //         Reflect.defineMetadata(injectSymbol, injections[propertyKey], target[propertyKey]);
        //     Reflect.defineMetadata(injectSymbol, injections, target)
        // }
        // else
        // {
        switch (context.kind)
        {
            case "field":
                return injectField(name as string).call(this, target as undefined, context);

            case "class":
                return injectable(target as (new (...args: U) => T));

            case "method":
                return injectClassMethod(name as string[]).call(this, target as ((...args: U) => T), context);
        }

        //     }
    } as any
}

export function applyInjector(injector: Injector, obj: object, prototype?: object)
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
                        return oldFunction.apply(this, Injector.mergeArrays(injections[property].map(p => (p as ParameterInjection)(injector)), ...args));
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

type Constructor<T, U extends unknown[] = unknown[]> = (new (...args: U) => T)

export function injectable<TInstance, TClass extends Constructor<TInstance>>(ctor: TClass, injector?: Injector): Exclude<TClass, Constructor<TInstance>> & { new(...args: unknown[]): TInstance } 
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
                if ((!injector || !(injector instanceof Injector)) && injections && injections.length)
                    throw new Error(`No injector was provided while it is required to construct ${ctor}`)
                // if (injector)
                //     Reflect.defineMetadata(injectSymbol, injector, new.target);
            }
            let injected = injections && injections.map(f => f(injector)) || [];
            injected = injected.filter(p => typeof p.index == 'number');
            super(...Injector.mergeArrays(injected, ...args))
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

    return result as any;
}

export type InjectableClass<T> = T & {
    new(injector: Injector): T;
};

export function useInjector(injector: Injector)
{
    return function classInjectorDecorator<TClass extends { new(...args: unknown[]): object }>(ctor: TClass, context: ClassDecoratorContext): TClass
    {
        return injectable(ctor, injector);
    }
}

export function extendInject<TClass extends { new(...args: unknown[]): object }>(injector: Injector, constructor: TClass, context: ClassDecoratorContext)
{
    return useInjector(injector)<TClass>(constructor, context);
}


export class ReflectionInjector extends Injector
{
    constructor(protected parent?: Injector)
    {
        super(parent);
    }
}

export var defaultInjector = new Injector();
