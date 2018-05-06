import * as di from '@akala/core'
import { control, BaseControl } from './control'

@control()
export class Value extends BaseControl<string>
{
    constructor()
    {
        super('value', 400)
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
            parameter.onChanged(function (ev)
            {
                if (parameter !== ev.source)
                {
                    switch (element.tagName)
                    {
                        case 'INPUT':
                            switch ((element as HTMLInputElement).type)
                            {
                                case 'checkbox':
                                case 'radio':
                                    (element as HTMLInputElement).checked = ev.eventArgs.value;
                                    break;
                                default:
                                    (element as HTMLInputElement).value = ev.eventArgs.value;
                                    break;
                            }
                            break;
                    }
                }
            });
        }
        else
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
            }
    }
}
