import { parse, format } from 'url';
import * as akala from '@akala/core';
import { service } from './common'
import * as contentType from 'content-type';
import * as mime from 'mime';

// @service('$http')
export class Http implements akala.Http<XMLHttpRequest>
{
    constructor() { }

    public get<T=string>(url: string, params?: any): PromiseLike<T>
    {
        return this.unwrap(this.call({ method: 'GET', url: url, params: params }));
    }
    public post<T=string>(url: string, body?: any): PromiseLike<T>
    {
        return this.unwrap(this.call({ method: 'POST', url: url, body: body }));
    }

    public getJSON<T=any>(url: string, params?: any): PromiseLike<T>
    {
        return this.unwrap(this.call({ url: url, params: params, method: 'GET', type: 'json' }));
    }

    private unwrap<T>(request: PromiseLike<{ response: XMLHttpRequest, body: T }>): PromiseLike<T>
    {
        return request.then(function (response)
        {
            return response.body;
        }, function (rejection)
            {
                return rejection;
            });
    }

    public call<T=string>(options: akala.HttpOptions): PromiseLike<{ response: XMLHttpRequest, body: T }>
    public call<T=string>(method: string, url: string, query?: any, body?: any): PromiseLike<{ response: XMLHttpRequest, body: T }>
    public call<T=string>(method: string | akala.HttpOptions, url?: string, query?: any, body?: any): PromiseLike<{ response: XMLHttpRequest, body: T }>
    {
        var req = new XMLHttpRequest();
        var options: akala.HttpOptions;
        if (typeof (method) == 'string')
            options = { method: method, url: url, params: query, body: body };
        else
            options = method;
        var uri = parse(options.url);
        if (method != 'GET')
            uri.query = akala.extend({}, uri.query, query);
        req.open(options.method, format(uri), true);
        return new Promise<{ response: XMLHttpRequest, body: T }>((resolve, reject) =>
        {
            var self = this;
            req.onreadystatechange = function (aEvt)
            {
                if (req.readyState == 4)
                {
                    if (req.status == 301)
                        return self.call<T>(options.method, req.getResponseHeader('location')).then(function (data)
                        {
                            resolve(data);
                        }, function (data)
                            {
                                reject(data);
                            });

                    if (req.status == 200)
                        switch (req.getResponseHeader('Content-Type') && mime.getExtension(contentType.parse(req.getResponseHeader('Content-Type')).type))
                        {
                            default:
                                resolve({ response: req, body: req.response });
                                break;
                            case "html":
                            case "xml":
                                resolve({ response: req, body: req.responseXML as any || req.responseText });
                                break;
                            case "json":
                                if (typeof (req.response) == 'string')
                                    resolve({ response: req, body: JSON.parse(req.response) });
                                else
                                    resolve({ response: req, body: req.response });
                                break;
                            case "txt":
                                resolve({ response: req, body: req.responseText as any });
                                break;
                        }
                    else
                        reject(req.responseText);
                }
            };

            if (options.headers)
            {
                akala.each(options.headers, function (value, key)
                {
                    if (value instanceof Date)
                        req.setRequestHeader(key, value.toISOString());
                    else
                        req.setRequestHeader(key, value && value.toString());
                });
            }
            switch (options.contentType)
            {
                case 'json':
                    req.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
                    break;
                case 'form':
                    req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded; charset=UTF-8');
                    break;
                }

            switch (options.type)
            {
                case 'json':
                    req.setRequestHeader('Accept', 'application/json, text/json');
                    break;
                    case 'xml':
                    req.setRequestHeader('Accept', 'text/xml');
                    break;
                }

            if (options.method != 'GET')
            {
                if (options.body instanceof FormData)
                    req.send(options.body);
                else if (typeof (options.body) == 'object')
                {
                    switch (options.contentType)
                    {
                        case 'form':
                            req.send(serialize(options.body));
                            break;
                        case 'json':
                        default:
                            req.send(JSON.stringify(options.body));
                            break;
                    }
                }
                else
                    req.send(options.body);
            }
            else
                req.send(null);
        });
    }
}

function serialize(obj, prefix?: string)
{

    return akala.map(obj, function (value, key)
    {

        if (typeof (value) == 'object')
        {

            var keyPrefix = prefix;
            if (prefix)
            {
                if (typeof (key) == 'number')
                    keyPrefix = prefix.substring(0, prefix.length - 1) + '[' + key + '].';
                else
                    keyPrefix = prefix + encodeURIComponent(key) + '.';
            }
            return serialize(value, keyPrefix);
        }
        else
        {
            return (prefix || '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
        }
    }, true)
}