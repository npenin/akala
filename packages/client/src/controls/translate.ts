import * as di from '@akala/core'
import { control, BaseControl } from './control'
import { Text } from './text'


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
export class Translate extends Text
{
    constructor(private translator: di.Translator)
    {
        super('translate')
    }

    protected setValue(element: JQuery, value)
    {
        element.text(this.translator(value));
    }
}