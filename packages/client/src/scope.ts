import * as akala from '@akala/core';


export interface IScope<T> extends akala.IWatched
{
    $new<U>(): IScope<U>;
    $set<U extends keyof T>(expression: U | string, value: T[U] | any);
    $watch(expression: string, handler: (value: any) => void);
    $inject(f: Function);
}

export class Scope<T> implements IScope<T>
{
    constructor()
    {
    }

    private resolver: akala.Injector;
    public $$watchers: { [key: string]: akala.Binding } = {};

    public $new<U>(): Scope<U>
    {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }

    public $inject<T>(f: akala.Injectable<T>)
    {
        var scope = this;
        if (!this.resolver)
        {
            this.resolver = new akala.Injector();
            this.resolver.setInjectables(this);
        }
        return this.resolver.inject(f)(this);

    }

    public $set(expression: string, value: any)
    {
        akala.Binding.getSetter(this, expression)(value, 'scope');
    }

    public $watch(expression: string, handler: (value: any) => void)
    {
        var binding = this.$$watchers[expression];
        if (!binding)
        {
            binding = new akala.Binding(expression, this);
            this.$$watchers[expression] = binding;
        }
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