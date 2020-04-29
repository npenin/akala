import * as di from '@akala/core'
import { control, BaseControl } from './control'

@control()
export class Value extends BaseControl<string>
{
    constructor()
    {
        super('value', 400)
    }

    public apply(target: any, element: HTMLElement, parameter: string)
    {
        switch (element.tagName)
        {
            case 'INPUT':
                switch ((element as HTMLInputElement).type)
                {
                    case 'checkbox':
                    case 'radio':
                        (element as HTMLInputElement).checked = !!parameter;
                        break;
                    default:
                        (element as HTMLInputElement).value = parameter;
                        break;
                }
                break;
            case 'SELECT':
                //covered by options control
                break;
        }
    }

    public link(target: any, element: HTMLElement, parameter: di.Binding | string)
    {
        if (typeof (parameter) == 'undefined')
            return;
        if (parameter instanceof di.Binding)
        {
            element.addEventListener('change', function ()
            {
                switch (element.tagName)
                {
                    case 'INPUT':
                        switch ((element as HTMLInputElement).type)
                        {
                            case 'checkbox':
                            case 'radio':
                                parameter.setValue((element as HTMLInputElement).checked, parameter);
                                break;
                            default:
                                parameter.setValue((element as HTMLInputElement).value, parameter);
                                break;
                        }
                        break;
                }
            });
            parameter.onChanged((ev) =>
            {
                if (parameter !== ev.source)
                {
                    this.apply(target, element, ev.eventArgs.value);
                }
            });
        }
        else
            this.apply(target, element, parameter);
    }
}
