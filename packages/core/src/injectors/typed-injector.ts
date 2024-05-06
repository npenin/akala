import { isPromiseLike } from '../promiseHelpers.js';
import { Event, EventArgs, EventEmitter, EventListener, IEvent } from '../event-emitter.js';
import "reflect-metadata";
import { Injector, LocalInjector, injectorLog } from './shared.js';
import { SimpleInjector, defaultInjector } from './simple-injector.js';

export type NestedKeys<TypeMap extends object, TKey> = TKey extends keyof TypeMap ? Exclude<TKey, number> : TKey extends `${infer A}.${infer B}` ? A extends keyof TypeMap ? TypeMap[A] extends Record<string, unknown> ? NestedKeys<TypeMap[A], B> : never : never : never;
export type NestedPath<TypeMap extends object, TKey> = TKey extends keyof TypeMap ? TypeMap[TKey] : TKey extends `${infer A}.${infer B}` ? A extends keyof TypeMap ? TypeMap[A] extends Record<string, unknown> ? NestedPath<TypeMap[A], B> : never : never : never;

export class TypedInjector<TypeMap extends object = Record<string, unknown>> extends LocalInjector
{
    constructor(parent?: Injector | null)
    {
        if (typeof parent === 'undefined')
            parent = defaultInjector as any;

        super(parent);
    }

    private notifier = new EventEmitter<{ [key in keyof TypeMap]: IEvent<[PropertyDescriptor], void, unknown> }>();

    public setInjectables(value: TypeMap)
    {
        this.injectables = value;
    }

    public keys()
    {
        return Object.keys(this.injectables) as (keyof TypeMap)[];
    }

    protected notify<TKey extends keyof TypeMap>(name: TKey, value?: PropertyDescriptor)
    {
        if (typeof value == 'undefined')
            value = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (typeof value !== 'undefined')
            this.notifier.emit(name, ...[value] as EventArgs<typeof this.notifier['events'][TKey]>);
        if (this.parent && this.parent instanceof TypedInjector)
            this.parent.notify(name, value);
    }

    public onResolve<const TKey extends keyof TypeMap>(name: NestedKeys<TypeMap, TKey>): PromiseLike<NestedPath<TypeMap, TKey>>
    public onResolve<const TKey extends keyof TypeMap>(name: NestedKeys<TypeMap, TKey>, handler: (value: NestedPath<TypeMap, TKey>) => void): void
    public onResolve<const TKey extends keyof TypeMap>(name: NestedKeys<TypeMap, TKey>, handler?: (value: NestedPath<TypeMap, TKey>) => void): void | PromiseLike<NestedPath<TypeMap, TKey>>
    // public onResolve<T = unknown>(name: string, handler?: (value: T) => void)
    {
        if (!handler)
            return new Promise((resolve) =>
            {
                this.onResolve(name, resolve);
            })

        const value = this.resolve<NestedPath<TypeMap, TKey>, NestedKeys<TypeMap, TKey>>(name);
        if (value !== undefined && value !== null)
        {
            handler(value);
            return;
        }
        if (!this.parent)
            this.notifier.once(name as keyof TypeMap, ((prop: PropertyDescriptor) =>
            {
                if (prop.get)
                    handler(prop.get());
                else
                    handler(prop.value);
            }) as any);
        else
            this.parent.onResolve(name, handler as any);
    }

    resolve<T, const TKey extends NestedKeys<TypeMap, string | symbol>>(param: TKey): NestedPath<TypeMap, TKey> & T
    // resolve<const TKey extends Exclude<string | number | symbol, keyof TypeMap>>(param: TKey): T
    // resolve<const TKey extends string | number | symbol = keyof TypeMap>(param: TKey): TKey extends keyof TypeMap ? TypeMap[TKey] : T
    {
        injectorLog.silly('resolving ' + param.toString);

        if (param in this.injectables)
        {
            if (injectorLog.verbose.enabled)
            {
                const obj = this.injectables[param as keyof TypeMap];
                if (typeof obj === 'object' && 'name' in obj)
                    injectorLog.verbose(`resolved ${param.toString()} to ${obj} with name ${obj.name}`);
                else
                    injectorLog.verbose(`resolved ${param.toString()} to %O`, obj);
            }
            else
                injectorLog.debug(`resolved ${param.toString()}`);
            return this.injectables[param as keyof TypeMap] as T & NestedPath<TypeMap, TKey>;
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
                    return this.parent.resolve(key as NestedKeys<TypeMap, string>);
                }
                return result && result[key];
            }, this.injectables) as NestedPath<TypeMap, TKey> & T;

        }
        if (this.parent)
        {
            injectorLog.silly('trying parent injector');
            return this.parent.resolve(param as NestedKeys<TypeMap, string>);
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

    protected injectables: Partial<TypeMap> = {};

    public unregister(name: string)
    {
        const registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    public registerDescriptor<const TKey>(name: NestedKeys<TypeMap, TKey>, value: PropertyDescriptor, override?: boolean)
    {
        if (typeof name == 'string')
        {
            const indexOfDot = name.indexOf('.');
            if (~indexOfDot)
            {
                let nested = this.resolve(name.substring(0, indexOfDot) as NestedKeys<TypeMap, string>);
                if (typeof nested == 'undefined' || nested === null)
                    this.registerDescriptor(name.substring(0, indexOfDot) as any, { configurable: false, value: nested = new TypedInjector<NestedPath<TypeMap, TKey> & Record<string, unknown>>() as any })
                if (nested instanceof LocalInjector)
                    nested.registerDescriptor(name.substring(indexOfDot + 1), value, override);
                else
                    throw new Error('compound keys like ' + name + ' can be used only with injector-like as intermediaries')
            }
        }
        injectorLog.debug('registering ' + name.toString());
        if (!override && typeof (this.injectables[name as keyof TypeMap]) != 'undefined')
            throw new Error('There is already a registered item for ' + name.toString());
        if (typeof (this.injectables[name as keyof TypeMap]) !== 'undefined')
            this.unregister(name.toString());
        Object.defineProperty(this.injectables, name, value);
        this.notify(name as keyof TypeMap, value);
    }
}