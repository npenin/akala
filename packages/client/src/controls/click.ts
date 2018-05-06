import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding, isPromiseLike } from '@akala/core'
import { IScope } from '../scope';

@control()
export class Click extends BaseControl<Function>
{
    constructor()
    {
        super('click', 400)
    }

    public link(scope: IScope<any>, element: Element, parameter: Binding | Function)
    {
        element.addEventListener('click', function ()
        {
            if (parameter instanceof Binding)
            {
                var value = parameter.getValue();
                if (isPromiseLike(value))
                {
                    value.then(function (value)
                    {
                        if (value instanceof Function)
                            return scope.$inject(value);
                    })
                }
                if (value instanceof Function)
                    return scope.$inject(value);
            }
            else
                return scope.$inject(<Function>parameter);
        });

    }
}
