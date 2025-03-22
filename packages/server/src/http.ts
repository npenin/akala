import { FetchHttp, Http as coreHttp } from '@akala/core';
import { XMLParser } from 'fast-xml-parser'

FetchHttp.prototype['getXML'] = function (this: FetchHttp, url: string)
{
    return this.call({ url: url, method: 'get' }).then(r => r.text().then(text =>
    {
        return new XMLParser().parse(text);
    }))
}

export interface Http extends coreHttp
{
    getXML<T = unknown>(url: string): PromiseLike<T>
}
