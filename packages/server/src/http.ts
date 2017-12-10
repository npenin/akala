import * as akala from '@akala/core';
import * as request from 'request';
import { parse, format } from 'url';
import * as stream from 'stream';
import * as xml from 'xml2js';
import { HttpOptions } from '@akala/core';

export class Http implements akala.Http<request.RequestResponse>
{
    constructor()
    {
    }

    private unwrap<T>(request: PromiseLike<{ response: request.RequestResponse, body: T }>)
    {
        return request.then(function (res)
        {
            return res.body;
        }, function (rejection)
            {
                return rejection;
            });
    }

    public get<T>(url: string, params?: any)
    {
        return this.unwrap<T>(this.call({ method: 'GET', url: url, params: params }));
    }

    public post(url: string, body?: any)
    {
        return this.unwrap(this.call({ method: 'POST', url: url, body: body }));
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
        return this.call({ method: 'POST', url: url, headers: { SOAPAction: namespace + '#' + action }, body: body });
    }

    public download(url: string, target: stream.Writable, options?: request.CoreOptions)
    {
        return request.get(akala.extend({ uri: parse(url) }, options)).pipe(target);
    }

    public getJSON<T>(url: string, params?: any)
    {
        return this.unwrap<T>(this.call<T>({ method: 'GET', url: url, params: params, type: 'json' }));
    }
    public getXML<T>(url: string, params?: any): PromiseLike<T>
    {
        return this.unwrap<T>(this.call({ method: 'GET', url: url, params: params, type: 'xml' }));
    }

    public call<T=string>(method: string | HttpOptions, url?: string, params?: any): PromiseLike<{ response: request.RequestResponse, body: T }>
    {
        var options: HttpOptions;
        if (typeof (method) == 'string')
            options = { method: method, url: url, params: params };
        else
            options = method;

        var uri = parse(options.url, true);
        uri.query = akala.extend({}, uri.query, params);

        var optionsMerged: request.OptionsWithUri = akala.extend({ uri: uri, method: options.method }, {
            json: options.type == 'json',
            formData: options.contentType == 'form' && options.body,
            body: options.contentType != 'form' && options.body,
            headers: options.headers
        });
        
        return new Promise((resolve, reject) =>
        {
            var resultHandler = function (error, response, body)
            {
                if (error)
                    reject(error);
                else if (options.type != 'xml')
                    resolve({ response: response, body: body });
                else
                {
                    xml.parseString(body, function (err, result)
                    {
                        if (err)
                            reject(err);
                        else
                            resolve({ response: response, body: result });
                    });
                }

            };

            request(optionsMerged, resultHandler)
        });
    }

}