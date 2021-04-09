import * as akala from '@akala/core';

export interface IScope<T> extends akala.IWatched
{
    $new<U>(): IScope<U>;
    $set<U extends Exclude<keyof T, number | symbol>>(expression: U, value: T[U]);
    $set(expression: string, value: any);
    $set(expression: string, value: any);
    $watch(expression: string, handler: (value: any) => void);
    $inject(f: (...args: unknown[]) => unknown);
    $bind(expression: string): akala.Binding;
}

export class Scope<T> implements IScope<T>
{
    public get $root() { return this; }

    private $$resolver: akala.Injector;
    public $$watchers: { [key: string]: akala.Binding } = {};

    public $new<U>(): Scope<U>
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
        return new newScope();
    }

    public $inject<T>(f: akala.Injectable<T>, params?: { [key: string]: any })
    {
        if (!Object.getOwnPropertyDescriptor(this, '$$resolver'))
        {
            this.$$resolver = new akala.Injector();
            this.$$resolver.setInjectables(this);
        }
        const inj = new akala.Injector(this.$$resolver);
        if (params)
        {
            akala.each(params, (value, key) =>
                inj.register(key as string, value)
            );
        }
        // applyInjector(inj, f);
        return inj.inject(f)(this);
    }

    public $set(expression: string, value: any)
    {
        akala.Binding.getSetter(this, expression)(value);
    }

    public $bind(expression: string): akala.Binding
    {
        let binding = this.$$watchers[expression];
        if (!binding)
        {
            binding = new akala.Binding(expression, this);
            this.$$watchers[expression] = binding;
        }
        return binding;
    }

    public $watch(expression: string, handler: (value: any) => void)
    {
        const binding = this.$bind(expression);
        if (!binding['handlers'])
            binding['handlers'] = [];
        if (binding['handlers'].indexOf(handler) > -1)
            return;
        binding['handlers'].push(handler);
        binding.onChanged(function (ev)
        {
            handler(ev.eventArgs.value);
        });
    }
}