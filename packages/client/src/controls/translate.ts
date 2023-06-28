import * as akala from '@akala/core'
import { control } from './control.js'
import { Text } from './text.js'


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
    @akala.inject('$translator') private translator: akala.Translator

    constructor(translator: akala.Translator)
    {
        super()
        this.translator = translator;
    }

    protected setValue(element: Element, value)
    {
        element.textContent = this.translator(value);
    }
}