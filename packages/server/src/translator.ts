import * as akala from '@akala/core';
import * as path from 'path';
import * as fs from 'fs';

akala.defaultInjector.registerFactory('$translator', function (): akala.Translator
{
    var language = akala.defaultInjector.resolve('$language');
    if (language)
        var translations = require(path.join(__dirname, 'i18n.' + akala.defaultInjector.resolve('$language') + '.json'));
    else
        translations = {};

    return function (key: string, ...parameters: any[])
    {
        if (!parameters)
            return translations[key] || key;
        return (translations[key] || key).replace(/\{\d+\}/g, function (m)
        {
            return parameters[m];
        })
    }
}, true);