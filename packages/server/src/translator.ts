import { Translator, defaultInjector } from '@akala/core';
import * as path from 'path';

defaultInjector.registerFactory('$translator', async function (): Promise<Translator>
{
    const language = defaultInjector.resolve<string | Intl.Locale>('$language');
    let translations: { [key: string]: string };
    if (language)
        translations = await import(path.join(__dirname, 'i18n.' + defaultInjector.resolve<string>('$language') + '.json'));
    else
        translations = {};

    return {
        locale: language,
        translate: function (key: string | { key: string, fallback: string }, ...parameters: unknown[])
        {
            let fallback: string;
            if (typeof key == 'object')
            {
                fallback = key.fallback;
                key = key.key;
            }
            else
                fallback = key;
            if (!parameters)
                return translations[key] || fallback;
            return (translations[key] || fallback).replace(/\{\d+\}/g, function (m)
            {
                return parameters[m];
            })
        }
    }
}, true);
