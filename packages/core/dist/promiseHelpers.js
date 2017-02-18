"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const events_1 = require("events");
function Promisify(o) {
    if (o && o instanceof Promise)
        return o;
    if (o && o['then'])
        return o;
    var deferred = new Deferred();
    var e = new Error();
    setTimeout(function () {
        console.debug(e.stack);
        deferred.resolve(o);
    });
    return deferred;
}
exports.Promisify = Promisify;
function isPromiseLike(o) {
    return o && o.then && typeof (o.then) == 'function';
}
exports.isPromiseLike = isPromiseLike;
var PromiseStatus;
(function (PromiseStatus) {
    PromiseStatus[PromiseStatus["Pending"] = 0] = "Pending";
    PromiseStatus[PromiseStatus["Resolved"] = 1] = "Resolved";
    PromiseStatus[PromiseStatus["Rejected"] = 2] = "Rejected";
})(PromiseStatus = exports.PromiseStatus || (exports.PromiseStatus = {}));
class Deferred extends events_1.EventEmitter {
    constructor() {
        super();
        this.$$status = PromiseStatus.Pending;
    }
    resolve(val) {
        if (isPromiseLike(val))
            val.then(this.resolve.bind(this), this.reject.bind(this));
        else {
            this.$$status = PromiseStatus.Resolved;
            this.$$value = val;
            this.emit('resolve', val);
        }
    }
    reject(reason) {
        this.$$value = reason;
        this.$$status = PromiseStatus.Rejected;
        this.emit('reject', reason);
    }
    then(onfulfilled, onrejected) {
        switch (this.$$status) {
            case PromiseStatus.Resolved:
                var deferred = new Deferred();
                setImmediate(deferred.resolve.bind(deferred), Promisify(onfulfilled(this.$$value)));
                return deferred;
            case PromiseStatus.Rejected:
                var deferred = new Deferred();
                setImmediate(deferred.reject.bind(deferred), Promisify(onrejected(this.$$value)));
                return deferred;
            case PromiseStatus.Pending:
                var next = new Deferred();
                this.once('resolve', function (value) {
                    var result = onfulfilled(value);
                    if (typeof (result) == 'undefined')
                        next.resolve(value);
                    else
                        next.resolve(result);
                });
                this.once('reject', function (value) {
                    if (onrejected)
                        next.reject(onrejected(value));
                });
                return next;
        }
    }
}
exports.Deferred = Deferred;
//# sourceMappingURL=promiseHelpers.js.map