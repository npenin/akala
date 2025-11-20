import { EventEmitter } from '../events/event-emitter.js';
import { Event } from '../events/shared.js';
import "reflect-metadata";
import { type InjectMap, Injector, LocalInjector, type Resolvable, type ResolvableArray, injectorLog } from './shared.js';
import { LogLevels } from '../logging/shared.js';

/** 
 * A simple dependency injection container that provides basic resolution capabilities.
 * This class extends LocalInjector and manages injectables through a straightforward key-value store.
 */
export class SimpleInjector extends LocalInjector
{
    /**
     * Creates an instance of SimpleInjector.
     * @param {Injector | null} [parent=null] - The parent injector to fallback to when resolving dependencies.
     */
    constructor(parent?: Injector | null)
    {
        super(parent === null ? null : parent || defaultInjector);
        this.register('$injector', this as any);
        this.notifier = new EventEmitter();
    }

    private readonly notifier: EventEmitter<{ [key: string | symbol]: Event<[PropertyDescriptor]> }>;

    /**
     * Sets the injectables.
     * @param {{ [key: string]: unknown }} value - The injectables to set.
     */
    public setInjectables(value: { [key: string]: unknown })
    {
        this.injectables = value;
    }

    /**
     * Returns the keys of the injectables.
     * @returns {string[]} The keys of the injectables.
     */
    public keys()
    {
        return Object.keys(this.injectables);
    }

    /**
     * Merges another SimpleInjector into this one.
     * @param {SimpleInjector} i - The SimpleInjector to merge.
     */
    public merge(i: SimpleInjector)
    {
        Object.getOwnPropertyNames(i.injectables).forEach((property) =>
        {
            if (property != '$injector')
                this.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        });
    }

    /**
     * Notifies listeners of a change.
     * @param {string} name - The name of the property that changed.
     * @param {PropertyDescriptor} [value] - The new value of the property.
     */
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

    /**
     * Registers a handler to be called when a value is resolved.
     * @param {string} name - The name of the value to resolve.
     * @returns {PromiseLike<T>} A promise that resolves to the value.
     */
    public onResolve<T = unknown>(name: string): PromiseLike<T>
    /**
     * Registers a handler to be called when a value is resolved.
     * @param {string} name - The name of the value to resolve.
     * @param {(value: T) => void} handler - The handler to call when the value is resolved.
     */
    public onResolve<T = unknown>(name: string, handler: (value: T) => void): void
    public onResolve<T = unknown>(name: string, handler?: (value: T) => void)
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

    private resolveKeys<T>(keys: ResolvableArray<object>): T
    {
        return Injector.resolveKeys(this.injectables, keys, keys => this.parent?.resolve(keys));
    }

    /**
     * Resolves a value.
     * @param {Resolvable} param - The parameter to resolve.
     * @returns {T} The resolved value.
     */
    resolve<T>(param: Resolvable): T
    {
        injectorLog.silly('resolving %O', param);

        if (typeof param == 'object')
        {
            if (Array.isArray(param))
                return this.resolveKeys(param);

            const x = Injector.collectMap(param);

            return Injector.applyCollectedMap(param as InjectMap<T>, Object.fromEntries(x.map(x => [x, this.resolve(x)]))) as T;
        }

        if (this.injectables && param in this.injectables)
        {
            if (injectorLog.isEnabled(LogLevels.verbose))
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
            return this.resolveKeys((param as string).split('.'));
        }
        if (this.parent)
        {
            injectorLog.silly('trying parent injector');
            return this.parent.resolve(param);
        }
        return null;
    }

    private inspecting = false;

    /**
     * Inspects the injectables.
     */
    public inspect()
    {
        if (this.inspecting)
            return;
        this.inspecting = true;
        console.error(this.injectables);
        this.inspecting = false;
    }

    private browsingForJSON = false;

    /**
     * Converts the injectables to JSON.
     * @returns {object} The injectables as JSON.
     */
    public toJSON()
    {
        const wasBrowsingForJSON = this.browsingForJSON;
        this.browsingForJSON = true;
        if (!wasBrowsingForJSON)
            return this.injectables;
        this.browsingForJSON = wasBrowsingForJSON;
        return undefined;
    }

    protected injectables: {};

    /**
     * Unregisters an injectable.
     * @param {string} name - The name of the injectable to unregister.
     */
    public unregister(name: string)
    {
        const registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    /**
     * Registers a descriptor for an injectable.
     * @param {string | symbol} name - The name of the injectable.
     * @param {PropertyDescriptor} value - The descriptor of the injectable.
     * @param {boolean} [override] - Whether to override an existing injectable.
     */
    public registerDescriptor(name: string | symbol, value: PropertyDescriptor, override?: boolean)
    {
        this.injectables ??= {};

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

export const defaultInjector = new SimpleInjector(null);
