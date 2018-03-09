import * as di from '@akala/core';
import * as path from 'path';
import * as fs from 'fs';

di.registerFactory('$translator', function (): di.Translator
{
    var language = di.resolve('$language');
    if (language)
        var translations = require(path.join(__dirname, 'i18n.' + di.resolve('$language') + '.json'));
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