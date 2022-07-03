import * as di from '@akala/core'
import { control, GenericControlInstance } from './control'

@control('value', 400)
export class Value extends GenericControlInstance<string>
{
    constructor()
    {
        super()
    }

    public apply(target: unknown, element: HTMLElement, parameter: string)
    {
        switch (element.tagName)
        {
            case 'TEXTAREA':
                element.innerText = parameter || '';
                break;
            case 'INPUT':
                switch ((element as HTMLInputElement).type)
                {
                    case 'checkbox':
                    case 'radio':
                        (element as HTMLInputElement).checked = !!parameter;
                        break;
                    default:
                        (element as HTMLInputElement).value = parameter || '';
                        break;
                }
                break;
            case 'SELECT':
                //covered by options control
                break;
        }
    }

    public init()
    {
        if (typeof (this.parameter) == 'undefined')
            return;
        if (this.parameter instanceof di.Binding)
        {
            const parameter = this.parameter;
            this.element.addEventListener('change', () =>
            {
                switch (this.element.tagName)
                {
                    case 'TEXTAREA':
                        parameter.setValue(this.element.innerText, parameter);
                        break;
                    case 'INPUT':
                        switch ((this.element as HTMLInputElement).type)
                        {
                            case 'checkbox':
                            case 'radio':
                                parameter.setValue((this.element as HTMLInputElement).checked as unknown as string, parameter);
                                break;
                            default:
                                parameter.setValue((this.element as HTMLInputElement).value, parameter);
                                break;
                        }
                        break;
                }
            });
            parameter.onChanged((ev) =>
            {
                if (parameter !== ev.eventArgs.source)
                {
                    this.apply(this.scope, this.element, ev.eventArgs.value);
                }
            });
        }
        else
            this.apply(this.scope, this.element, this.parameter);
    }
}
