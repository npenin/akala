import * as akala from '@akala/core';
import * as request from 'request';
import { parse, format } from 'url';
import * as stream from 'stream';
import * as xml from 'xml2js';

export class Http implements akala.Http
{
    constructor()
    {
    }

    public get(url: string, params?: any)
    {
        return this.call('GET', url, params);
    }

    public post(url: string, body?: any)
    {
        return this.call('POST', url, null, { formData: body });
    }

    public invokeSOAP(namespace: string, action: string, url: string, params?: { [key: string]: string | number | boolean })
    {
        var body = '<?xml version="1.0" encoding="utf-8"?><s:Envelope s:encodingStyle="http://schemas.xmlsoap.org/soap/encoding/" xmlns:s="http://schemas.xmlsoap.org/soap/envelope/"><s:Body>' +
            '<u:' + action + ' xmlns:u="' + namespace + '">';
        akala.each(params, function (paramValue, paramName)
        {
            body += '<' + paramName + '><![CDATA[' + paramValue + ']]></' + paramName + '>';
        });
        body += '</u:' + action + '></s:Body></s:Envelope>';
        return this.call('POST', url, null, {
            headers: { SOAPAction: namespace + '#' + action }, formData: body
        });
    }

    public download(url: string, target: stream.Writable, options?: request.CoreOptions)
    {
        return request.get(akala.extend({ uri: parse(url) }, options)).pipe(target);
    }

    public getJSON(url: string, params?: any)
    {
        return this.call('GET', url, params, { json: true });
    }
    public getXML<T>(url: string, params?: any): PromiseLike<T>
    {
        return this.call('GET', url, params).then(function (result)
        {
            return new Promise<T>((resolve, reject) =>
            {
                xml.parseString(result.body, function (err, result)
                {
                    if (err)
                        reject(err);
                    else
                        resolve(result);
                });
            }) as PromiseLike<T>;
        });
    }

    public call(method: string, url: string, params?: any, options?: request.CoreOptions): PromiseLike<any>
    {
        var uri = parse(url, true);
        uri.query = akala.extend({}, uri.query, params);
        var optionsMerged = akala.extend({ uri: uri, method: method }, options);
        return new Promise((resolve, reject) =>
        {
            var resultHandler = function (error, response, body)
            {
                if (error)
                    reject(error);
                else
                    resolve({ response: response, body: body });
            };

            request(optionsMerged, resultHandler)
        });
    }

}