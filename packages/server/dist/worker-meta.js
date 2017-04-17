"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const router_1 = require("./router");
exports.Router = router_1.WorkerRouter;
function expressWrap(handler) {
    return function (req, next) {
        var callback = req.injector.resolve('$callback');
        handler(req, {
            sendStatus: callback,
            status: callback,
        }, next);
    };
}
exports.expressWrap = expressWrap;
//# sourceMappingURL=worker-meta.js.map