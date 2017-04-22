import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding } from '@akala/core'


di.registerFactory('$translator', di.injectWithName(['$translations'], function (translations): di.Translator
{
    return function (key: string, ...parameters: any[])
    {
        if (!parameters)
            return translations && translations[key] || key;
        return (translations && translations[key] || key).replace(/\{\d+\}/g, function (m)
        {
            return parameters[m];
        })
    }
}));

@control('$translator')
export class Translate extends BaseControl<string>
{
    constructor(private translator: di.Translator)
    {
        super('translate', 400)
    }

    public link(target: any, element: JQuery, parameter: Binding | string)
    {
        var translator = this.translator;
        if (parameter instanceof Binding)
        {
            parameter.onChanged(function (ev)
            {
                element.text(translator(ev.eventArgs.value));
            });
        }
        else
            element.text(translator(parameter));

    }
}
