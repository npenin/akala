import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'
import { IScope } from '../scope';

@control()
export class Click extends BaseControl<Function>
{
    constructor()
    {
        super('click', 400)
    }

    public link(scope: IScope<any>, element: JQuery, parameter: Binding | Function)
    {
        element.click(function ()
        {
            if (parameter instanceof Binding)
            {
                return scope.$inject(parameter.getValue());
            }
            else
                return scope.$inject(<Function>parameter);
        });

    }
}
