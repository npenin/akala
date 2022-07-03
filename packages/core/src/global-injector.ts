import { Injector, Injectable, Injected, InjectableAsync, defaultInjector, InjectableConstructor } from './injector';

// declare let $$defaultInjector;

if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = defaultInjector;


export function resolve<T = unknown>(name: string): T
{
    return defaultInjector.resolve<T>(name);
}

export function unregister(name: string)
{
    return defaultInjector.unregister(name);
}

export function merge(i: Injector)
{
    return defaultInjector.merge(i);
}

export function inspect()
{
    return defaultInjector.inspect();
}

export function inject<T>(injectable: Injectable<T>): Injected<T>
export function inject<T>(...toInject: string[]): (b: TypedPropertyDescriptor<T>) => void
export function inject<T>(a: string | Injectable<T>, ...b: string[])
{
    return defaultInjector.inject(a, ...b);
}

export function exec<T>(...toInject: string[]): (f: Injectable<T>) => T
{
    return defaultInjector.exec(...toInject);
}

export function injectNew<T>(a: InjectableConstructor<T>)
{
    return defaultInjector.injectNew(a);
}

export function injectWithName<T>(toInject: string[], a: Injectable<T>)
{
    return defaultInjector.injectWithName(toInject, a);
}

export function injectNewWithName<T>(toInject: string[], a: InjectableConstructor<T>)
{
    return defaultInjector.injectNewWithName<T>(toInject, a);
}

export function resolveAsync<T = unknown>(name: string)
{
    return defaultInjector.resolveAsync<T>(name)
}

export function onResolve<T = unknown>(name: string)
{
    return defaultInjector.onResolve<T>(name)
}

export function injectWithNameAsync<T>(toInject: string[], a: InjectableAsync<T> | Injectable<T>)
{
    return defaultInjector.injectWithNameAsync(toInject, a);
}

export function register<T>(name: string, value: T, override?: boolean)
{
    return defaultInjector.register(name, value, override);
}
export function registerFactory<T>(name: string, value: () => T, override?: boolean)
{
    return defaultInjector.registerFactory(name, value, override);
}