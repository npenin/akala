import * as di from '@akala/core'
import { control, Control } from './control'
import { Promisify, Binding } from '@akala/core'
import { IScope } from '../scope'

@control()
export class Spinner extends Control<any>
{
    constructor()
    {
        super('spinner', 50)
    }

    public instanciate(target: IScope<any>, element: JQuery, parameter: Binding | any)
    {
        var parent = element.parent();
        var wrapped = this.wrap(element, target, true);
        var settings: any = {};
        if (Array.isArray(parameter))
            settings.classes = parameter;
        else
            settings.classes = parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (wrapped != element && di.isPromiseLike(wrapped))
        {
            var spinner: JQuery;

            if (element[0].tagName.toLowerCase() == 'tr')
            {
                spinner = $('<tr class="spinner"><td colspan="99"></td></tr>').appendTo(parent);
                parent = spinner.find('td');
            }
            spinner = $('<span class="spinner"></span>');

            spinner.addClass(settings.classes);
            spinner.appendTo(parent);
            wrapped.then(function ()
            {
                spinner.remove();
            })
        }
        return wrapped;
    }
}
