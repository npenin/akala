"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const stream_1 = require("stream");
var debug = require('debug')('akala:router');
var exRouter = require('express/lib/router/index.js');
class Request extends stream_1.Readable {
    constructor(loc) {
        super();
        this.method = 'get';
        if (loc.hash)
            this.url = loc.hash.substr(1);
        else
            this.url = '/';
        this.uri = url.parse(this.url, true);
    }
}
exports.Request = Request;
;
class Response {
}
exports.Response = Response;
if (!window.setImmediate)
    window['setImmediate'] = function (fn) {
        var args = Array.prototype.slice.call(arguments, 1);
        return setTimeout(function () {
            fn.apply(this, args);
        }, 0);
    };
function router() {
    var proto = exRouter();
    var result = function (url) {
        var req = new Request(url);
        debug(req.uri);
        var res = new Response();
        proto(req, res, function (err) {
            if (err)
                console.error(err);
        });
    };
    result['__proto__'] = proto;
    return result;
}
exports.router = router;
//# sourceMappingURL=router.js.map