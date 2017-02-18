import * as di from 'akala-core';
import * as path from 'path';
import * as fs from 'fs';

di.registerFactory('$translator', function (): Translator
{
    var translations = require(path.join(__dirname, 'i18n.' + di.resolve('$language') + '.json'));

    return function (key: string, ...parameters: any[])
    {
        if (!parameters)
            return translations[key] || key;
        (translations[key] || key).replace(/\{\d+\}/g, function (m)
        {
            return parameters[m];
        })
    }
});
export interface Translator
{
    (key: string): string;
    (format: string, ...parameters: any[]): string;
}