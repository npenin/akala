import { control, GenericControlInstance, Control, ControlControlParameter } from './control.js'
import { ObservableArray, ObservableArrayEventArgs, Binding, ParsedString, isPromiseLike, each } from '@akala/core'

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
        removeClass(element, item.getValue())
    }
}

type classParamType = Binding<string> | Binding<string[]> | ParsedString | string[] | string | { [key: string]: boolean };

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
        item.onChanged(async function (ev)
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
        each(item, function (toggle, key)
        {
            if (typeof (toggle) == 'string' && !isNaN(Number(key)))
            {
                addClass(element, toggle);
            }
            else if (toggle instanceof Binding)
                toggle.onChanged(function (ev)
                {
                    if (ev.value)
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
export class CssClass extends GenericControlInstance<string[]>
{
    constructor(factory: Control<unknown>, target: unknown, element: HTMLElement, parameter: ControlControlParameter<CssClass>)
    {
        super();
        if (Array.isArray(parameter))
        {
            parameter = new ObservableArray(parameter);
        }
        if (parameter instanceof ObservableArray)
        {
            parameter.addListener(function (arg: ObservableArrayEventArgs<string>)
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
            });
            parameter.init();
        }
        else
            addClass(element, parameter);
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-function
    public apply() { }
}
