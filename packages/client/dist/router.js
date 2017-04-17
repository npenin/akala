"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url = require("url");
const akala = require("@akala/core");
var debug = require('debug')('akala:router');
class Request {
    constructor(loc) {
        if (loc.hash)
            this.url = loc.hash.substr(1);
        else
            this.url = '/';
        this.uri = url.parse(this.url, true);
    }
}
exports.Request = Request;
;
if (!window.setImmediate)
    window['setImmediate'] = function (fn) {
        var args = arguments.length && Array.prototype.slice.call(arguments, 1) || [];
        return setTimeout(function () {
            fn.apply(this, args);
        }, 0);
    };
class BrowserLayer extends akala.Layer {
    constructor(path, options, handler) {
        super(path, options, handler);
    }
}
exports.BrowserLayer = BrowserLayer;
class BrowserRoute extends akala.Route {
    constructor(path) {
        super(path);
    }
    buildLayer(path, options, callback) {
        return new BrowserLayer('/', options, callback);
    }
}
exports.BrowserRoute = BrowserRoute;
class Router extends akala.Router {
    constructor(options) {
        super(options);
    }
    buildLayer(path, options, handler) {
        return new BrowserLayer(path, options, handler);
    }
    buildRoute(path) {
        return new BrowserRoute(path);
    }
}
exports.Router = Router;
function router() {
    var proto = new Router();
    return proto;
}
exports.router = router;
//# sourceMappingURL=router.js.map