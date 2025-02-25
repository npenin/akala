import { Binding, Injectable, ObservableObject, Parser, SimpleInjector, Subscription, each } from "@akala/core";

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

export class ScopeImpl<T extends object> implements IScope<T>
{
    public static readonly injectionToken = ScopeInjectionToken;
    public get $root() { return this; }

    private $$resolver: SimpleInjector;
    public $$watchers: Partial<{ [key in keyof T]: Binding<T[key]> }> = {};

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

    public $inject<T, TArgs extends unknown[]>(f: Injectable<T, TArgs>, params?: { [key: string]: unknown })
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

    public $set(expression: string, value: unknown)
    {
        ObservableObject.setValue(this, new Parser().parse(expression), value);
    }
    public $setAsync(expression: string, value: Promise<unknown>)
    {
        value.then(value => ObservableObject.setValue(this, new Parser().parse(expression), value));
    }

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

    public $watch(expression: string, handler: (value: unknown) => void)
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