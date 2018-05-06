import * as di from '@akala/core'
import { control, Control } from './control'
import { Promisify, Binding } from '@akala/core'
import { IScope } from '../scope'
import { Template } from '../template';

@control()
export class Spinner extends Control<any>
{
    constructor()
    {
        super('spinner', 50)
    }

    public instanciate(target: IScope<any>, element: HTMLElement, parameter: Binding | any)
    {
        var parent: Element = element;
        var wrapped = this.wrap(element, target, true);
        var settings: any = {};
        if (parameter instanceof Binding)
        {
            parameter = parameter.getValue();
            if (di.isPromiseLike(parameter))
                wrapped = parameter;
        }
        if (parameter && parameter.promise instanceof Binding)
        {
            var promise = parameter.promise.getValue();
            if (di.isPromiseLike(promise))
                wrapped = promise;
        }
        if (Array.isArray(parameter))
            settings.classes = parameter;
        else
            settings.classes = parameter && parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (wrapped != element && di.isPromiseLike(wrapped))
        {
            var spinner: Element;

            if (element[0].tagName.toLowerCase() == 'tr')
            {
                spinner = element.parentElement.appendChild(Template.buildElements('<tr class="spinner"><td colspan="99"></td></tr>')[0]);
                parent = spinner.getElementsByTagName('td')[0];
            }
            if (element[0].tagName.toLowerCase() == 'li')
            {
                spinner = element.parentElement.appendChild(Template.buildElements('<li class="spinner"></li>')[0]);
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
