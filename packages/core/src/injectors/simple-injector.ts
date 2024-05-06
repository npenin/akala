import { isPromiseLike } from '../promiseHelpers.js';
import { Event, EventEmitter } from '../event-emitter.js';
import "reflect-metadata";
import { Injector, LocalInjector, injectorLog } from './shared.js';


export class SimpleInjector extends LocalInjector
{
    constructor(parent?: Injector | null)
    {
        super(parent || defaultInjector);
        this.notifier = new EventEmitter();
    }

    private notifier: EventEmitter<{ [key: string | symbol]: Event<[PropertyDescriptor]> }>;

    public setInjectables(value: { [key: string]: unknown })
    {
        this.injectables = value;
    }

    public keys()
    {
        return Object.keys(this.injectables);
    }

    public merge(i: SimpleInjector)
    {
        Object.getOwnPropertyNames(i.injectables).forEach((property) =>
        {
            if (property != '$injector')
                this.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        })
    }

    protected notify(name: string, value?: PropertyDescriptor)
    {
        if (this.notifier == null)
            return
        if (typeof value == 'undefined')
            value = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (this.notifier.hasListener(name))
            this.notifier.emit(name, value);
        if (this.parent && this.parent instanceof SimpleInjector)
            this.parent.notify(name, value);
    }

    public onResolve<T = unknown>(name: string): PromiseLike<T>
    public onResolve<T = unknown>(name: string, handler: (value: T) => void): void
    public onResolve<T = unknown>(name: string, handler?: (value: T) => void)
    // public onResolve<T = unknown>(name: string, handler?: (value: T) => void)
    {
        if (!handler)
            return new Promise((resolve) =>
            {
                this.onResolve(name, resolve);
            })

        const value = this.resolve<T>(name);
        if (value !== undefined && value !== null)
        {
            handler(value);
            return;
        }
        if (!this.parent)
            this.notifier.once(name, (prop: PropertyDescriptor) =>
            {
                if (prop.get)
                    handler(prop.get());
                else
                    handler(prop.value);
            });
        else
            this.parent.onResolve(name, handler);
    }

    resolve<T>(param: string): T
    // resolve<const TKey extends Exclude<string | number | symbol, keyof TypeMap>>(param: TKey): T
    // resolve<const TKey extends string | number | symbol = keyof TypeMap>(param: TKey): TKey extends keyof TypeMap ? TypeMap[TKey] : T
    {
        injectorLog.silly('resolving ' + param.toString);

        if (param in this.injectables)
        {
            if (injectorLog.verbose.enabled)
            {
                const obj = this.injectables[param];
                if (typeof obj === 'object' && 'name' in obj)
                    injectorLog.verbose(`resolved ${param.toString()} to ${obj} with name ${obj.name}`);
                else
                    injectorLog.verbose(`resolved ${param.toString()} to %O`, obj);
            }
            else
                injectorLog.debug(`resolved ${param.toString()}`);
            return this.injectables[param] as T;
        }
        const indexOfDot = typeof param !== 'string' ? -1 : param.indexOf('.');

        if (~indexOfDot)
        {
            const keys = (param as string).split('.')
            return keys.reduce((result, key) =>
            {
                if (result instanceof SimpleInjector)
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
            injectorLog.silly('trying parent injector');
            return this.parent.resolve(param) as T;
        }
        return null;
    }

    private inspecting = false;

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
        // console.log(args);
        const wasBrowsingForJSON = this.browsingForJSON;
        this.browsingForJSON = true;
        if (!wasBrowsingForJSON)
            return this.injectables;
        this.browsingForJSON = wasBrowsingForJSON;
        return undefined;
    }

    protected injectables = {};

    public unregister(name: string)
    {
        const registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    public registerDescriptor(name: string | symbol, value: PropertyDescriptor, override?: boolean)
    {
        if (this.injectables == null)
            this.injectables = {};
        if (typeof name == 'string')
        {
            const indexOfDot = name.indexOf('.');
            if (~indexOfDot)
            {
                let nested = this.resolve(name.substring(0, indexOfDot));
                if (typeof nested == 'undefined' || nested === null)
                    this.registerDescriptor(name.substring(0, indexOfDot), { configurable: false, value: nested = new SimpleInjector() })
                if (nested instanceof LocalInjector)
                    nested.registerDescriptor(name.substring(indexOfDot + 1), value, override);
                else
                    throw new Error('compound keys like ' + name + ' can be used only with injector-like as intermediaries')
            }
        }
        injectorLog.debug('registering ' + name.toString());
        if (!override && typeof (this.injectables[name]) != 'undefined')
            throw new Error('There is already a registered item for ' + name.toString());
        if (typeof (this.injectables[name]) !== 'undefined')
            this.unregister(name.toString());
        Object.defineProperty(this.injectables, name, value);
        this.notify(name.toString(), value);
    }
}

export var defaultInjector = new SimpleInjector(null);
