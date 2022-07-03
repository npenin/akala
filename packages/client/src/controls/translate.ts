import * as akala from '@akala/core'
import { control } from './control'
import { Text } from './text'


akala.defaultInjector.registerFactory('$translator', akala.defaultInjector.injectWithName(['$translations'], function (translations): akala.Translator
{
    return function (key: string, ...parameters: unknown[])
    {
        if (!parameters)
            return translations && translations[key] || key;
        return (translations && translations[key] || key).replace(/\{\d+\}/g, function (m)
        {
            return parameters[m];
        })
    }
}));

@control('translate')
export class Translate extends Text
{
    constructor(@akala.inject('$translator') private translator: akala.Translator)
    {
        super()
    }

    protected setValue(element: Element, value)
    {
        element.textContent = this.translator(value);
    }
}