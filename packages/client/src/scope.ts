import * as di from 'akala-core';


export interface IScope extends di.IWatched
{
    $new(): IScope
    $set(expression: string, value: any);
    $watch(expression: string, handler: (value: any) => void);
}

export class Scope implements IScope
{
    constructor()
    {
    }

    private $watchers: { [key: string]: di.Binding } = {};

    public $new(): Scope
    {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }

    public $set(expression: string, value: any)
    {
        di.Binding.getSetter(this, expression)(value, 'scope');
    }

    public $watch(expression: string, handler: (value: any) => void)
    {
        var binding = this.$watchers[expression];
        if (!binding)
        {
            binding = new di.Binding(expression, this);
            this.$watchers[expression] = binding;
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