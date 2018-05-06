import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, ObservableArray, ObservableArrayEventArgs, Binding, ParsedString, isPromiseLike } from '@akala/core'

@control()
export class CssClass extends BaseControl<any>
{
    constructor()
    {
        super('class', 400)
    }

    public link(target: any, element: Element, parameter: any)
    {
        if (parameter instanceof Array)
        {
            parameter = new ObservableArray(parameter);
        }
        if (parameter instanceof ObservableArray)
            parameter.on('collectionChanged', function (arg: ObservableArrayEventArgs<any>)
            {
                arg.newItems.forEach(function (item)
                {
                    if (typeof (item) == 'string')
                        element.classList.add(item);
                    else if (item instanceof ParsedString)
                        element.classList.add(item.value);
                    else if (item instanceof Binding)
                    {
                        var oldValue = null;
                        item.onChanged(function (ev)
                        {
                            if (oldValue)
                                element.classList.remove(oldValue);
                            if (isPromiseLike(ev.eventArgs.value))
                                ev.eventArgs.value.then(function (value)
                                {
                                    oldValue = value;
                                    element.classList.add(value)
                                });
                            else
                            {
                                element.classList.add(ev.eventArgs.value);
                                oldValue = ev.eventArgs.value;
                            }
                        });
                    }
                    else
                        Object.keys(item).forEach(function (key)
                        {
                            if (item[key] instanceof Binding)
                            {
                                item[key].onChanged(function (ev)
                                {
                                    element.classList.toggle(key, ev.eventArgs.value);
                                });
                            }
                            else
                                element.classList.toggle(key, item[key]);
                        })

                })
            }).init();

        else
        {

            Object.keys(parameter).forEach(function (key)
            {
                if (parameter[key] instanceof Binding)
                {
                    parameter[key].onChanged(function (ev)
                    {
                        element.classList.toggle(key, ev.eventArgs.value);
                    });
                }
                else
                    element.classList.toggle(key, parameter[key]);
            })
        }

    }
}
