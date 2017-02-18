import * as di from 'akala-core';

export interface IScope extends di.IWatched
{
    $new(): IScope
    $set(expression: string, value: any);
    $watch(expression: string, handler: (value: any) => void);
}

export class Scope implements IScope
{
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
        var binding = new di.Binding(expression, this);
        binding.onChanged(function (ev)
        {
            handler(ev.eventArgs.value);
        });
    }
}