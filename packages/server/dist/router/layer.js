"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@akala/core");
class HttpLayer extends core_1.Layer {
    constructor(path, options, fn) {
        super(path, options, fn);
        if (!(this instanceof HttpLayer)) {
            return new HttpLayer(path, options, fn);
        }
    }
    isApplicable(req, route) {
        var method = req.method.toLowerCase();
        if (method === 'head' && !route.methods['head']) {
            method = 'get';
        }
        return !this.method || this.method === method;
    }
}
exports.HttpLayer = HttpLayer;
//# sourceMappingURL=layer.js.map