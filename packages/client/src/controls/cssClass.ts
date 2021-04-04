import * as akala from '@akala/core'
import { control, BaseControl, GenericControlInstance, Control } from './control'
import { Promisify, ObservableArray, ObservableArrayEventArgs, Binding, ParsedString, isPromiseLike } from '@akala/core'

function removeClass(element: HTMLElement, item: ParsedString | Array<string> | string | { [key: string]: boolean })
{

    if (typeof (item) == 'undefined')
        return;
    if (typeof (item) == 'string')
        if (~item.indexOf(' '))
            removeClass(element, item.split(' '));
        else
            element.classList.remove(item);
    else if (item instanceof ParsedString)
        return removeClass(element, item.value);
    else if (item instanceof Binding)
    {

    }
}

type classParamType = Binding | ParsedString | Array<string> | string | { [key: string]: boolean };

function addClass(element: HTMLElement, item: classParamType)
{
    if (typeof (item) == 'undefined')
        return;
    if (typeof (item) == 'string')
    {
        if (~item.indexOf(' '))
            return addClass(element, item.split(' '));
        element.classList.add(item);
    }
    else if (item instanceof ParsedString)
        return addClass(element, item.value);
    else if (item instanceof Binding)
    {
        let oldValue = null;
        item.onChanged(function (ev)
        {
            if (oldValue)
                removeClass(element, oldValue);
            if (isPromiseLike(ev.eventArgs.value))
                ev.eventArgs.value.then(function (value)
                {
                    oldValue = value;
                    addClass(element, value);
                });
            else
            {
                addClass(element, ev.eventArgs.value);
                oldValue = ev.eventArgs.value;
            }
        });
    }
    else
        akala.each(item, function (toggle, key)
        {
            if (typeof (toggle) == 'string' && !isNaN(Number(key)))
            {
                addClass(element, toggle);
            }
            else if (toggle instanceof Binding)
                toggle.onChanged(function (ev)
                {
                    if (ev.eventArgs.value)
                        addClass(element, key as string);
                    else
                        removeClass(element, key as string);
                });
            else if (toggle)
                addClass(element, key as string);
            else
                removeClass(element, key as string);
        })
}

@control('class', 400)
export class CssClass extends GenericControlInstance<any>
{
    constructor(factory: Control<any>, target: any, element: HTMLElement, parameter: any)
    {
        super();
        if (parameter instanceof Array)
        {
            parameter = new ObservableArray(parameter);
        }
        if (parameter instanceof ObservableArray)
            parameter.on('collectionChanged', function (arg: ObservableArrayEventArgs<any>)
            {
                if (arg.newItems)
                    arg.newItems.forEach(function (item)
                    {
                        addClass(element, item);
                    })
                if (arg.oldItems)
                    arg.oldItems.forEach(function (item)
                    {
                        removeClass(element, item);
                    })
            }).init();
        else
            addClass(element, parameter);
    }

    public apply() { }
}
