import { parse, format } from 'url';
import * as di from '@akala/core';
import { service } from './common'

// @service('$http')
export class Http implements di.Http
{
    constructor() { }

    public get(url: string, params?: any)
    {
        return this.call('GET', url, params);
    }

    public getJSON(url: string, params?: any)
    {
        return this.get(url, params).then(function (data)
        {
            return JSON.parse(data);
        });
    }

    public call(method: string, url: string, params?: any): PromiseLike<string>
    {
        var uri = parse(url);
        uri.query = $.extend({}, uri.query, params);
        var req = new XMLHttpRequest();
        req.open(method, format(uri), true);
        var deferred = new di.Deferred<string>();
        var self = this;
        req.onreadystatechange = function (aEvt)
        {
            if (req.readyState == 4)
            {
                if (req.status == 301)
                    return self.call(method, req.getResponseHeader('location')).then(function (data)
                    {
                        deferred.resolve(data);
                    }, function (data)
                        {
                            deferred.reject(data);
                        })
                if (req.status == 200)
                    deferred.resolve(req.responseText);
                else
                    deferred.reject(req.responseText);
            }
        };
        req.send(null);
        return deferred;
    }
}