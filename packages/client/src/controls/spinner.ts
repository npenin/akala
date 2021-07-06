import * as di from '@akala/core'
import { control, Control, GenericControlInstance } from './control'
import { Binding } from '@akala/core'
import { IScope } from '../scope'
import { Template } from '../template';

@control('spinner', 50)
export class Spinner extends GenericControlInstance<any>
{
    constructor()
    {
        super();
    }

    public init()
    {
        let parent: Element = this.element;
        let wrapped: PromiseLike<any> = this.factory.wrap(this.element, this.scope, true);
        const settings: any = {};
        if (this.parameter instanceof Binding)
        {
            const parameter = this.parameter.getValue();
            if (di.isPromiseLike(parameter))
                wrapped = parameter;
        }
        if (this.parameter && this.parameter.promise instanceof Binding)
        {
            const promise = this.parameter.promise.getValue();
            if (di.isPromiseLike(promise))
                wrapped = promise;
        }
        if (Array.isArray(this.parameter))
            settings.classes = this.parameter;
        else
            settings.classes = this.parameter && this.parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (di.isPromiseLike(wrapped))
        {
            let spinner: Element;

            if (this.element[0].tagName.toLowerCase() == 'tr')
            {
                spinner = this.element.parentElement.appendChild(Template.buildElements('<tr class="spinner"><td colspan="99"></td></tr>')[0]);
                parent = spinner.getElementsByTagName('td')[0];
            }
            if (this.element[0].tagName.toLowerCase() == 'li')
            {
                spinner = this.element.parentElement.appendChild(Template.buildElements('<li class="spinner"></li>')[0]);
                parent = spinner;
            }
            spinner = Template.buildElements('<span class="spinner"></span>')[0];

            spinner.classList.add(settings.classes);
            parent.appendChild(spinner);
            Promise.resolve(wrapped).then(function ()
            {
                spinner.remove();
            })
        }
        return wrapped;
    }
}
