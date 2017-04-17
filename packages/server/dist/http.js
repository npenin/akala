"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const $ = require("underscore");
const ajax = require("request");
const url_1 = require("url");
class Http {
    constructor() {
    }
    get(url, params) {
        return this.call('GET', url, params);
    }
    getJSON(url, params) {
        return this.call('GET', url, params, { json: true });
    }
    call(method, url, params, options) {
        var uri = url_1.parse(url);
        uri.query = $.extend({}, uri.query, params);
        var defer = new di.Deferred();
        var optionsMerged = $.extend({ uri: uri }, options);
        var resultHandler = function (error, response, body) {
            if (error)
                defer.reject(error);
            else
                defer.resolve(body);
        };
        switch (method.toUpperCase()) {
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
exports.Http = Http;
//# sourceMappingURL=http.js.map