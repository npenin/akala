"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const di = require("akala-core");
// @service('$http')
class Http {
    constructor() { }
    get(url, params) {
        return this.call('GET', url, params);
    }
    getJSON(url, params) {
        return this.get(url, params).then(function (data) {
            return JSON.parse(data);
        });
    }
    call(method, url, params) {
        var uri = url_1.parse(url);
        uri.query = $.extend({}, uri.query, params);
        var req = new XMLHttpRequest();
        req.open(method, url_1.format(uri), true);
        var deferred = new di.Deferred();
        req.onreadystatechange = function (aEvt) {
            if (req.readyState == 4) {
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
exports.Http = Http;
//# sourceMappingURL=http.js.map