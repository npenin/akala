"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./router");
exports.Router = router_1.WorkerRouter;
const stream = require("stream");
function expressWrap(handler) {
    return function (req, next) {
        var callback = req.injector.resolve('$callback');
        var headers = {};
        var response = buildResponse(callback, next);
        handler(req, response, next);
    };
}
exports.expressWrap = expressWrap;
function buildResponse(callback, next) {
    return new MyResponse(callback, next);
}
class MyResponse extends stream.Writable {
    constructor(callback, next) {
        super({ decodeStrings: true });
        this.headers = {};
        this.links = undefined;
        this.jsonp = undefined;
        this.sendFile = undefined;
        this.sendfile = undefined;
        this.download = undefined;
        this.type = undefined;
        this.format = undefined;
        this.attachment = undefined;
        this.headersSent = false;
        this.get = undefined;
        this.clearCookie = undefined;
        this.cookie = undefined;
        /**
            * Render `view` with the given `options` and optional callback `fn`.
            * When a callback function is given a response will _not_ be made
            * automatically, otherwise a response of _200_ and _text/html_ is given.
            *
            * Options:
            *
            *  - `cache`     boolean hinting to the engine it should cache
            *  - `filename`  filename of the view being rendered
            */
        this.render = undefined;
        /**
         * Adds the field to the Vary response header, if it is not there already.
         * Examples:
         *
         *     res.vary('User-Agent').render('docs');
         *
         */
        this.vary = undefined;
        this.app = undefined;
        this.setTimeout = undefined;
        this.addTrailers = undefined;
        this.chunks = [];
        this.writeContinue = undefined;
        this.writable = true;
        this.headers = {};
        this.sendStatus = callback;
        this.status = callback;
        this.send = callback;
        this.json = callback;
    }
    contentType(type) { this.setHeader('contentType', type); return this; }
    set(field, value) {
        return this.header(field, value);
    }
    header(field, value) {
        if (typeof field == 'string') {
            if (typeof (value) == 'undefined')
                return this.headers[field];
            this.setHeader(field, value);
            return this;
        }
        else
            Object.keys(field).forEach(function (key) {
                this.setHeader(key, field[key]);
            });
    }
    location(location) { this.setHeader('location', location); return this; }
    setHeader(field, value) {
        this.headers[field] = value;
    }
    redirect(url, status) {
        if (typeof (status) == 'undefined')
            status = 302;
        if (typeof (url) == 'number' && typeof (status) == 'string') {
            var swap = url;
            url = status;
            status = swap;
        }
        this.setHeader('location', url);
        this.send(status);
    }
    write(str, encoding, fd) {
        if (typeof str != 'string') {
            if (typeof (encoding) == 'string')
                str = str.toString(encoding);
        }
        this.chunks.push(str);
        return true;
    }
    writeHead(statusCode, reasonPhrase, headers) {
        this.statusCode = statusCode;
        if (typeof reasonPhrase != 'string') {
            headers = reasonPhrase;
            reasonPhrase = null;
        }
        if (reasonPhrase)
            this.statusMessage = reasonPhrase;
        this.header(headers);
    }
    getHeader(name) {
        return this.headers[name];
    }
    ;
    removeHeader(name) {
        delete this.headers[name];
    }
    _write(chunk, encoding, callback) {
        if (encoding)
            this.chunks.push(chunk.toString(encoding));
        else
            this.chunks.push(chunk);
        if (callback)
            callback();
    }
    end(data, encoding, cb) {
        this.write(data, encoding, cb);
        this.send(this, this.chunks);
    }
}
//# sourceMappingURL=worker-meta.js.map