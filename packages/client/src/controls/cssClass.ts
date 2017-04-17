import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, ObservableArray, ObservableArrayEventArgs, Binding } from '@akala/core'

@control()
export class CssClass extends BaseControl<any>
{
    constructor()
    {
        super('class', 400)
    }

    public link(target: any, element: JQuery, parameter: any)
    {
        if (parameter instanceof Array)
        {
            new ObservableArray(parameter).on('collectionChanged', function (arg: ObservableArrayEventArgs<any>)
            {
                for (var i in arg.newItems)
                {
                    if (typeof (arg.newItems[i]) == 'string')
                        element.addClass(arg.newItems[i]);
                    else
                    {
                        if (arg.newItems[i] instanceof Binding)
                        {
                            arg.newItems[i].onChanged(function (target, eventArgs)
                            {
                                element.addClass(arg.newItems[i].getValue());
                            });
                            // element.text(parameter.getValue());
                        }
                        else
                            element.addClass(arg.newItems[i]);
                    }
                }
            }).init();
        }
        else
        {

            Object.keys(parameter).forEach(function (key)
            {
                (<Binding>parameter[key]).onChanged(function (ev)
                {
                    element.toggleClass(key, ev.eventArgs.value);
                });

                element.toggleClass(key, (<Binding>parameter[key]).getValue());
            })
        }

    }
}
