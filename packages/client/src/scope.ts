import { Binding, Injectable, ObservableObject, Parser, SimpleInjector, Subscription, each } from "@akala/core";

/** 
 * The IScope interface defines the contract for a scope object in the application.
 * It provides methods for managing variables, dependency injection, and binding to observables.
 * @template T The type of the scope's data object.
 */
export interface IScope<T extends object>
{
    $new<U extends object>(): IScope<U>;
    $setAsync(expression: string, value: unknown): void;
    $set<U extends Exclude<keyof T, number | symbol>>(expression: U, value: T[U]): void;
    $set(expression: string, value: unknown): void;
    $watch(expression: string, handler: (value: unknown) => void): Subscription;
    $inject(f: (...args: unknown[]) => unknown): void;
    $bind(expression: string): Binding<unknown>;
}

export type Scope<T extends object> = T & IScope<T>;

const ScopeInjectionToken = Symbol('scope injection token');

/** 
 * Core implementation of the IScope interface providing variable management, dependency injection, and observable binding capabilities.
 * @template T The type of the scope's data object.
 */
export class ScopeImpl<T extends object> implements IScope<T>
{
    public static readonly injectionToken = ScopeInjectionToken;
    public get $root() { return this; }

    /** 
     * Dependency injection resolver for this scope 
     */
    private $$resolver: SimpleInjector;

    /** 
     * Map of active bindings for observable properties 
     */
    public $$watchers: Partial<{ [key in keyof T]: Binding<T[key]> }> = {};

    /** 
     * Creates a new child scope inheriting from this scope
     */
    public $new<U extends object>(): IScope<U>
    {
        const root = this['$root'] || this;
        var newScope = function ()
        {
            Object.defineProperty(this, '$parent', {
                get()
                {
                    return newScope.prototype;
                }
            })

            Object.defineProperty(this, '$root', {
                get()
                {
                    return root;
                }
            })
        };
        newScope.prototype = this;
        return new ObservableObject(new newScope()).target;
    }

    /** 
     * Injects a service into the scope using dependency injection
     * @param f Injectable service constructor
     * @param params Optional parameters to override dependencies
     */
    public $inject<T, TArgs extends unknown[]>(f: Injectable<T, TArgs>, params?: { [key: string]: unknown }): T
    {
        if (!Object.getOwnPropertyDescriptor(this, '$$resolver'))
        {
            this.$$resolver = new SimpleInjector();
            this.$$resolver.setInjectables(this as unknown as { [key: string]: unknown });
        }
        const inj = new SimpleInjector(this.$$resolver);
        if (params)
        {
            each(params, (value, key) =>
                inj.register(key as string, value)
            );
        }
        // applyInjector(inj, f);
        return inj.inject(f)(this);
    }

    /** 
     * Sets the value of an expression in the scope
     * @param expression Property path (e.g. "user.name")
     * @param value New value
     */
    public $set(expression: string, value: unknown)
    {
        ObservableObject.setValue(this, new Parser().parse(expression), value);
    }

    /** 
     * Sets the value of an expression asynchronously
     * @param expression Property path
     * @param value Promise resolving to new value
     */
    public $setAsync(expression: string, value: Promise<unknown>)
    {
        value.then(v => ObservableObject.setValue(this, new Parser().parse(expression), v));
    }

    /** 
     * Creates or retrieves a binding for an observable expression
     * @param expression Property path to bind
     * @returns Binding instance
     */
    public $bind(expression: string): Binding<unknown>
    {
        let binding = this.$$watchers[expression];
        if (!binding)
        {
            binding = new Binding(this, new Parser().parse(expression));
            this.$$watchers[expression] = binding;
        }
        return binding;
    }

    /** 
     * Watches for changes to an expression and calls handler when value changes
     * @param expression Property path to watch
     * @param handler Callback to execute on change
     * @returns Subscription to remove the watcher
     */
    public $watch(expression: string, handler: (value: unknown) => void): Subscription
    {
        const binding = this.$bind(expression);
        if (!binding['handlers'])
            binding['handlers'] = [];
        if (binding['handlers'].indexOf(handler) > -1)
            return;
        binding['handlers'].push(handler);
        return binding.onChanged(function (ev)
        {
            handler(ev.value);
        });
    }
}
