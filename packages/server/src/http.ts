import { FetchHttp, Http as coreHttp } from '@akala/core';
import * as xml2js from 'xml2js'

FetchHttp.prototype['getXML'] = function (this: FetchHttp, url: string)
{
    return this.call({ url: url, method: 'get' }).then(r => r.text().then(text =>
    {
        return new Promise((resolve, reject) =>
        {
            xml2js.parseString(text, { async: true }, function (err, result)
            {
                if (err)
                    reject(err);
                else
                    resolve(result);
            });
        })
    }))
}

export interface Http extends coreHttp
{
    getXML<T=any>(url: string): PromiseLike<T>
}