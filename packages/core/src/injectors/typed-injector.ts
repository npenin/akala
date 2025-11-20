import { isPromiseLike } from '../promiseHelpers.js';
import { EventEmitter } from '../events/event-emitter.js';
import type { EventArgs, IEvent } from '../events/shared.js';
import "reflect-metadata";
import { Injector, LocalInjector, injectorLog } from './shared.js';
import { defaultInjector } from './simple-injector.js';
import { LogLevels } from '../logging/shared.js';

export type NestedKeys<TypeMap extends object, TKey> = TKey extends keyof TypeMap ? Exclude<TKey, number> : TKey extends `${infer A}.${infer B}` ? A extends keyof TypeMap ? TypeMap[A] extends Record<string, unknown> ? NestedKeys<TypeMap[A], B> : never : never : never;
export type NestedPath<TypeMap extends object, TKey> = TKey extends keyof TypeMap ? TypeMap[TKey] : TKey extends `${infer A}.${infer B}` ? A extends keyof TypeMap ? TypeMap[A] extends Record<string, unknown> ? NestedPath<TypeMap[A], B> : never : never : never;

/**
 * TypedInjector class description.
 */
export class TypedInjector<TypeMap extends object = Record<string, unknown>> extends LocalInjector
{
    /**
     * Constructor description.
     * @param {Injector | null} parent - Description of the parent parameter.
     */
    constructor(parent?: Injector | null)
    {
        if (typeof parent === 'undefined')
            parent = defaultInjector as any;

        super(parent);
        this.register('$injector', this as any);
    }

    private notifier = new EventEmitter<{ [key in keyof TypeMap]: IEvent<[PropertyDescriptor], void, unknown> }>();

    /**
     * setInjectables function description.
     * @param {TypeMap} value - Description of the value parameter.
     */
    public setInjectables(value: TypeMap)
    {
        this.injectables = value;
    }

    /**
     * keys function description.
     * @returns {Array<keyof TypeMap>} Description of the return value.
     */
    public keys()
    {
        return Object.keys(this.injectables) as (keyof TypeMap)[];
    }

    /**
     * notify function description.
     * @param {keyof TypeMap} name - Description of the name parameter.
     * @param {PropertyDescriptor} [value] - Description of the value parameter.
     */
    protected notify<TKey extends keyof TypeMap>(name: TKey, value?: PropertyDescriptor)
    {
        if (typeof value == 'undefined')
            value = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (typeof value !== 'undefined')
            this.notifier.emit(name, ...[value] as EventArgs<typeof this.notifier['events'][TKey]>);
        if (this.parent && this.parent instanceof TypedInjector)
            this.parent.notify(name, value);
    }

    /**
     * onResolve function description.
     * @param {NestedKeys<TypeMap, TKey>} name - Description of the name parameter.
     * @returns {PromiseLike<NestedPath<TypeMap, TKey>>} Description of the return value.
     */
    public onResolve<const TKey extends keyof TypeMap>(name: NestedKeys<TypeMap, TKey>): PromiseLike<NestedPath<TypeMap, TKey>>
    /**
     * onResolve function description.
     * @param {NestedKeys<TypeMap, TKey>} name - Description of the name parameter.
     * @param {(value: NestedPath<TypeMap, TKey>) => void} handler - Description of the handler parameter.
     */
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

    /**
     * resolve function description.
     * @param {NestedKeys<TypeMap, string | symbol>} param - Description of the param parameter.
     * @returns {NestedPath<TypeMap, TKey> & T} Description of the return value.
     */
    resolve<T, const TKey extends NestedKeys<TypeMap, string | symbol>>(param: TKey): NestedPath<TypeMap, TKey> & T
    // resolve<const TKey extends Exclude<string | number | symbol, keyof TypeMap>>(param: TKey): T
    // resolve<const TKey extends string | number | symbol = keyof TypeMap>(param: TKey): TKey extends keyof TypeMap ? TypeMap[TKey] : T
    {
        injectorLog.silly('resolving ' + param.toString);

        if (param in this.injectables)
        {
            if (injectorLog.isEnabled(LogLevels.verbose))
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
                if (result instanceof Injector)
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

    /**
     * inspect function description.
     */
    public inspect()
    {
        if (this.inspecting)
            return;
        this.inspecting = true;
        console.log(this.injectables);
        this.inspecting = false;
    }

    private browsingForJSON = false;

    /**
     * toJSON function description.
     * @returns {TypeMap | undefined} Description of the return value.
     */
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

    /**
     * unregister function description.
     * @param {string} name - Description of the name parameter.
     */
    public unregister(name: string)
    {
        const registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    /**
     * registerDescriptor function description.
     * @param {NestedKeys<TypeMap, TKey>} name - Description of the name parameter.
     * @param {PropertyDescriptor} value - Description of the value parameter.
     * @param {boolean} [override] - Description of the override parameter.
     */
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
        if (!override && typeof (this.injectables[name as keyof TypeMap]) !== 'undefined')
            throw new Error('There is already a registered item for ' + name.toString());
        if (typeof (this.injectables[name as keyof TypeMap]) !== 'undefined')
            this.unregister(name.toString());
        Object.defineProperty(this.injectables, name, value);
        this.notify(name as keyof TypeMap, value);
    }
}
