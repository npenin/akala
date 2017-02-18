"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("akala-core");
class Scope {
    $new() {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }
    $set(expression, value) {
        di.Binding.getSetter(this, expression)(value, 'scope');
    }
    $watch(expression, handler) {
        var binding = new di.Binding(expression, this);
        binding.onChanged(function (ev) {
            handler(ev.eventArgs.value);
        });
    }
}
exports.Scope = Scope;
//# sourceMappingURL=scope.js.map