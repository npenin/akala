import { Translator, defaultInjector } from '@akala/core';
import * as path from 'path';

defaultInjector.registerFactory('$translator', function (): Translator
{
    const language = defaultInjector.resolve('$language');
    let translations: { [key: string]: string };
    if (language)
        translations = require(path.join(__dirname, 'i18n.' + defaultInjector.resolve('$language') + '.json'));
    else
        translations = {};

    return function (key: string, ...parameters: unknown[])
    {
        if (!parameters)
            return translations[key] || key;
        return (translations[key] || key).replace(/\{\d+\}/g, function (m)
        {
            return parameters[m];
        })
    }
}, true);