import { getParamNames } from './reflect';
import * as debug from 'debug';
import { whenOrTimeout, isPromiseLike } from './promiseHelpers';
import { EventEmitter } from 'events';

var log = debug('akala:core:injector');

type Promisify<T> = T extends Promise<infer U> ? Promise<U> : T extends PromiseLike<infer U> ? PromiseLike<U> : PromiseLike<T>;
type UnPromisify<T> = T extends PromiseLike<infer U> ? U : T;

function ctorToFunction(this: new () => any)
{
    var args = [null];
    for (var i = 0; i < arguments.length; i++)
        args[i + 1] = arguments[i];
    return new (Function.prototype.bind.apply(this, args));
}

export type Injected<T> = (instance?: any) => T;
export type Injectable<T> = (...args: any[]) => T;
export type InjectableAsync<T> = (...args: any[]) => Promisify<T>;


export class Injector
{
    constructor(protected parent?: Injector)
    {
        if (this.parent == null)
            this.parent = defaultInjector;
        this.register('$injector', this);
    }

    private notifier = new EventEmitter();

    public setInjectables(value: { [key: string]: any })
    {
        this.injectables = value;
    }

    public keys()
    {
        return Object.keys(this.injectables);
    }

    public merge(i: Injector)
    {
        var self = this;
        Object.getOwnPropertyNames(i.injectables).forEach(function (property)
        {
            if (property != '$injector')
                self.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        })
    }

    protected notify<T>(name: string, value?: PropertyDescriptor)
    {
        if (typeof value == 'undefined')
            value = Object.getOwnPropertyDescriptor(this, name);
        if (this.notifier.listenerCount(name) > 0)
            this.notifier.emit(name, value);
        if (this.parent)
            this.parent.notify(name, value);
    }

    public onResolve<T = any>(name: string): PromiseLike<T>
    public onResolve<T = any>(name: string, handler: (value: T) => void): void
    public onResolve<T = any>(name: string, handler?: (value: T) => void)
    {
        if (!handler)
            return new Promise<T>((resolve, reject) =>
            {
                this.onResolve(name, resolve);
            })

        var value = this.resolve(name);
        if (value !== null)
        {
            handler(value);
            return;
        }

        this.notifier.once(name, (prop: PropertyDescriptor) =>
        {
            if (prop.get)
                handler(prop.get());
            else
                handler(prop.value);
        });
        if (this.parent)
            this.parent.onResolve(name, handler);
    }

    public inject<T>(a: Injectable<T>): Injected<T>
    public inject<T>(...a: string[]): (b: TypedPropertyDescriptor<Injectable<T>>) => void
    public inject<T>(a: Injectable<T> | string, ...b: string[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T>>) => void)
    public inject<T>(a: Injectable<T> | string, ...b: string[])
    {
        if (typeof a == 'function')
            return this.injectWithName(a['$inject'] || getParamNames(a), a);
        var self = this;
        return function (c: TypedPropertyDescriptor<Injectable<T>>)
        {
            if (typeof b == 'undefined')
                b = [];
            b.unshift(a);
            var oldf = self.injectWithName(b, c.value);
            c.value = function ()
            {
                return oldf.apply(this, arguments);
            }
        }
    }

    public injectAsync<T>(a: Injectable<Promisify<T>>)
    public injectAsync<T>(...a: string[])
    public injectAsync<T>(a: Injectable<Promisify<T>> | string, ...b: string[])
    {
        if (typeof a == 'function')
            return this.injectWithNameAsync(a['$inject'] || getParamNames(a), a)

        if (typeof b == 'undefined')
            b = [];
        b.unshift(a);
        var self = this;

        return function <U>(c: TypedPropertyDescriptor<InjectableAsync<U>>)
        {
            var f = c.value;
            c.value = function ()
            {
                return self.injectWithNameAsync(b, f);
            }
        }
    }

    public injectNew<T>(ctor: Injectable<T>)
    {
        return this.inject(ctorToFunction.bind(ctor));
    }

    public resolve<T = any>(param: string): T
    {
        log('resolving ' + param);

        if (typeof (this.injectables[param]) != 'undefined')
        {
            log(`resolved ${param}`);
            log.extend('verbose')(`resolved ${param} to ${this.injectables[param]}`);
            return this.injectables[param];
        }
        var indexOfDot = param.indexOf('.');

        if (~indexOfDot)
        {
            var keys = param.split('.')
            return keys.reduce((result, key, i) =>
            {
                if (result instanceof Proxy)
                    return result[key];
                if (result instanceof Injector)
                    return result.resolve(key);
                if (isPromiseLike(result))
                    return result.then((result) => { return result[key] });
                if (result === this.injectables && typeof (result[key]) == 'undefined' && this.parent)
                {
                    return this.parent.resolve(key);
                }
                return result && result[key];
            }, this.injectables);

        }
        if (this.parent)
        {
            log('trying parent injector');
            return this.parent.resolve<T>(param);
        }
        return null;
    }

    public resolveAsync<T = any>(name: string): T | PromiseLike<T>
    {
        log('resolving ' + name);
        if (typeof (this.injectables[name]) != 'undefined')
        {
            log('resolved ' + name + ' to %o', this.injectables[name]);
            return this.injectables[name];
        }
        if (this.parent)
        {
            log('trying parent injector');
            return this.parent.resolveAsync(name);
        }
        return this.onResolve<T>(name);
    }



    private inspecting: boolean = false;

    public inspect()
    {
        if (this.inspecting)
            return;
        this.inspecting = true;
        console.log(this.injectables);
        this.inspecting = false;
    }

    private browsingForJSON = false;

    public toJSON()
    {
        console.log(arguments);
        var wasBrowsingForJSON = this.browsingForJSON;
        this.browsingForJSON = true;
        if (!wasBrowsingForJSON)
            return this.injectables;
        this.browsingForJSON = wasBrowsingForJSON;
        return undefined;
    }

    public injectNewWithName(toInject: string[], ctor: Function)
    {
        return injectWithName(toInject, ctorToFunction.bind(ctor));
    }

    public injectWithNameAsync<T>(toInject: string[], a: InjectableAsync<T>): Promisify<T>
    {
        var paramNames = <string[]>getParamNames(a);
        var self = this;
        var wait = false;

        return new Promise<UnPromisify<T>>((resolve, reject) =>
        {
            if (paramNames.length == toInject.length || paramNames.length == 0)
            {
                if (toInject.length == paramNames.length && paramNames.length == 0)
                    resolve(a.call(null));
                else
                {
                    var args = [];
                    for (var param of toInject)
                    {
                        args[args.length] = self.resolveAsync(param);
                        if (isPromiseLike(args[args.length - 1]))
                            wait = true;
                    }
                    if (wait)
                        return Promise.all(args.map(function (v)
                        {
                            if (isPromiseLike(v))
                                return v;
                            return Promise.resolve(v);
                        })).then((args) => { resolve(a.apply(null, args)) });
                    else
                        resolve(a.apply(null, args));
                }
            }
            else
                reject('the number of arguments does not match the number of injected parameters');
        }) as unknown as Promisify<T>;
    }


    public injectWithName<T>(toInject: string[], a: Injectable<T>): Injected<T>
    {
        var paramNames = <string[]>getParamNames(a);
        var self = this;
        if (paramNames.length == toInject.length || paramNames.length == 0)
        {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                return <Injectable<T>>a;
            return function (instance?: any)
            {
                var args = [];
                for (var param of toInject)
                {
                    args[args.length] = self.resolve(param)
                }
                return a.apply(instance, args);
            }
        }
        else
            return function (instance?: any)
            {
                var args = [];
                var unknownArgIndex = 0;
                for (var param of toInject)
                {
                    var resolved = self.resolve(param);
                    if (resolved && paramNames.indexOf(param) == args.length)
                        args[args.length] = resolved;
                    else if (typeof (arguments[unknownArgIndex]) != 'undefined')
                        args[args.length] = arguments[unknownArgIndex++];
                    else
                        args[args.length] = resolved;
                }
                return a.apply(instance, args);
            }
    }


    private injectables = {};

    public unregister(name: string)
    {
        var registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    public register<T>(name: string, value: T, override?: boolean)
    {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }
    public registerFactory<T>(name: string, value: () => T, override?: boolean)
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
    public registerDescriptor(name: string, value: PropertyDescriptor, override?: boolean)
    {
        log('registering ' + name);
        if (!override && typeof (this.injectables[name]) != 'undefined')
            throw new Error('There is already a registered item for ' + name);
        if (typeof (this.injectables[name]) !== 'undefined')
            this.unregister(name);
        Object.defineProperty(this.injectables, name, value);
        this.notify(name, value);
    }
}

declare var $$defaultInjector;

if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = new Injector();

var defaultInjector: Injector = global['$$defaultInjector'];


export function resolve<T = any>(name: string): T
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

export function inject<T>(a: Injectable<T>): Injected<T>
export function inject<T>(...a: string[]): (b: TypedPropertyDescriptor<T>) => void
export function inject<T>(a: string | Injectable<T>, ...b: string[])
{
    return defaultInjector.inject(a, ...b);
}

export function injectNew<T>(a: Injectable<T>)
{
    return defaultInjector.injectNew(a);
}

export function injectWithName<T>(toInject: string[], a: Injectable<T>)
{
    return defaultInjector.injectWithName(toInject, a);
}

export function injectNewWithName(toInject: string[], a: Function)
{
    return defaultInjector.injectNewWithName(toInject, a);
}

export function resolveAsync<T = any>(name: string)
{
    return defaultInjector.resolveAsync<T>(name)
}

export function onResolve<T = any>(name: string)
{
    return defaultInjector.onResolve<T>(name)
}

export function injectWithNameAsync<T>(toInject: string[], a: InjectableAsync<T>)
{
    return defaultInjector.injectWithNameAsync(toInject, a);
}

export function register(name: string, value: any, override?: boolean)
{
    return defaultInjector.register(name, value, override);
}
export function registerFactory(name: string, value: () => any, override?: boolean)
{
    return defaultInjector.registerFactory(name, value, override);
}