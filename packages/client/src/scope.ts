import * as akala from '@akala/core';


export interface IScope<T> extends akala.IWatched
{
    $new<U>(): IScope<U>;
    $set<U extends Exclude<keyof T, number | symbol>>(expression: U, value: T[U]);
    $set(expression: string, value: any);
    $set(expression: string, value: any);
    $watch(expression: string, handler: (value: any) => void);
    $inject(f: Function);
    $bind(expression: string): akala.Binding;
}

export class Scope<T> implements IScope<T>
{
    constructor()
    {
    }

    private $$resolver: akala.Injector;
    public $$watchers: { [key: string]: akala.Binding } = {};

    public $new<U>(): Scope<U>
    {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }

    public $inject<T>(f: akala.Injectable<T>, params?: { [key: string]: any })
    {
        var scope = this;
        if (!this.hasOwnProperty('$$resolver'))
        {
            this.$$resolver = new akala.Injector();
            this.$$resolver.setInjectables(this);
        }
        var inj = new akala.Injector(this.$$resolver);
        if (params)
        {
            akala.each(params, (value, key) =>
                inj.register(key as string, value)
            );
        }
        return this.$$resolver.inject(f)(this);
    }

    public $set(expression: string, value: any)
    {
        akala.Binding.getSetter(this, expression)(value, 'scope');
    }

    public $bind(expression: string): akala.Binding
    {
        var binding = this.$$watchers[expression];
        if (!binding)
        {
            binding = new akala.Binding(expression, this);
            this.$$watchers[expression] = binding;
        }
        return binding;
    }

    public $watch(expression: string, handler: (value: any) => void)
    {
        var binding = this.$bind(expression);
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