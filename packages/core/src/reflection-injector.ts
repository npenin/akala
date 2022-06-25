import "reflect-metadata";
import { Injector, InjectedParameter } from './injector';

export type PropertyInjection = ((i: Injector) => void);
export type ParameterInjection = ((i: Injector) => InjectedParameter<any>);

export const injectSymbol = Symbol('inject');
export const afterInjectSymbol = Symbol('after-inject');

export interface InjectableOjbect
{
    [injectSymbol]: ((i: Injector) => void)[];
}

export function inject(name?: string)
{
    return function (target: any, propertyKey: string, parameterIndex?: number)
    {
        if (typeof parameterIndex == 'number')
        {
            if (!name)
                throw new Error('name is required as parameter names are not available in reflection');
            const injections: { [key: string]: (PropertyInjection | ParameterInjection)[] } = Reflect.getOwnMetadata(injectSymbol, target) || { [propertyKey]: [] };
            if (!injections[propertyKey])
                injections[propertyKey] = [];
            injections[propertyKey].push(function (injector: Injector)
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
            injections[propertyKey].push(function (injector: Injector)
            {
                this[propertyKey] = injector.resolve(name || propertyKey);
            });

            Reflect.defineMetadata(injectSymbol, injections, target)

        }
    }
}

export function applyInjector(injector: Injector, obj: any, prototype?: any)
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
                let value: any;
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
                    value: function injected(...args: any[]) 
                    {
                        return oldFunction.apply(this, Injector.mergeArrays(injections[property].map(p => (p as ParameterInjection)(injector)), ...args));
                    }
                })
            }
            else
            {
                injections[property].forEach(p => p.call(obj, injector));
            }
        }
    }
}

export function injectable<TInstance, TClass extends { new(...args: any[]): TInstance }>(ctor: TClass, injector?: Injector): TClass
{
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-expect-error
    const result = class DynamicProxy extends ctor
    {
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

    return result;
}

export type InjectableClass<T> = T & {
    new(injector: Injector): T;
};

export function useInjector(injector: Injector)
{
    // eslint-disable-next-line @typescript-eslint/ban-types
    return function classInjectorDecorator<TClass extends { new(...args: any[]): object }>(ctor: TClass): TClass
    {
        return injectable(ctor, injector);
    }
}

// eslint-disable-next-line @typescript-eslint/ban-types
export function extendInject<TClass extends { new(...args: any[]): object }>(injector: Injector, constructor: TClass)
{
    return useInjector(injector)<TClass>(constructor);
}


export class ReflectionInjector extends Injector
{
    constructor(protected parent?: Injector)
    {
        super(parent);
    }
}

export var defaultInjector = new Injector();
