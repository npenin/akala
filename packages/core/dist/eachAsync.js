"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function array(array, body, complete) {
    var loop = function (i) {
        if (i == array.length)
            complete();
        else
            try {
                body(array[i], i, function (error) {
                    if (error)
                        complete(error);
                    else
                        setImmediate(loop, i + 1);
                });
            }
            catch (e) {
                complete(e);
            }
    };
    loop(0);
}
exports.array = array;
function object(o, body, complete) {
    array(Object.keys(o), function (key, i, next) {
        body(o[key], key, next);
    }, complete);
}
exports.object = object;
function any(it, body, complete) {
    if (Array.isArray(it) || typeof (it['length']) != 'undefined')
        return array(it, body, complete);
    return object(it, body, complete);
}
exports.any = any;
//# sourceMappingURL=eachAsync.js.map