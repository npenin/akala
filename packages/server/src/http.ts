import * as di from '@akala/core';
import * as $ from 'underscore';
import * as ajax from 'request';
import { parse, format } from 'url';


export class Http implements di.Http
{
    constructor()
    {
    }

    public get(url: string, params?: any)
    {
        return this.call('GET', url, params);
    }

    public getJSON(url: string, params?: any)
    {
        return this.call('GET', url, params, { json: true });
    }

    public call(method: string, url: string, params?: any, options?: ajax.CoreOptions): PromiseLike<string>
    {
        var uri = parse(url);
        uri.query = $.extend({}, uri.query, params);
        var defer = new di.Deferred<string>();
        var optionsMerged: ajax.CoreOptions & ajax.UriOptions = $.extend({ uri: uri }, options);
        var resultHandler = function (error, response, body)
        {
            if (error)
                defer.reject(error);
            else
                defer.resolve(body);
        };
        switch (method.toUpperCase())
        {
            case 'GET':
                ajax.get(optionsMerged, resultHandler);
                break;
            case 'POST':
                ajax.post(optionsMerged, resultHandler);
                break;
            case 'DELETE':
                ajax.delete(optionsMerged, resultHandler);
                break;
            case 'PUT':
                ajax.put(optionsMerged, resultHandler);
                break;
            case 'HEAD':
                ajax.head(optionsMerged, resultHandler);
                break;
            case 'PATCH':
                ajax.patch(optionsMerged, resultHandler);
                break;
        }
        return defer;
    }

}