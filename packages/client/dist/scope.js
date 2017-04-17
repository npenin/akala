"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
class Scope {
    constructor() {
        this.$watchers = {};
    }
    $new() {
        var newScope = function () { };
        newScope.prototype = this;
        return new newScope();
    }
    $set(expression, value) {
        di.Binding.getSetter(this, expression)(value, 'scope');
    }
    $watch(expression, handler) {
        var binding = this.$watchers[expression];
        if (!binding) {
            binding = new di.Binding(expression, this);
            this.$watchers[expression] = binding;
        }
        if (!binding['handlers'])
            binding['handlers'] = [];
        if (binding['handlers'].indexOf(handler) > -1)
            return;
        binding['handlers'].push(handler);
        binding.onChanged(function (ev) {
            handler(ev.eventArgs.value);
        });
    }
}
exports.Scope = Scope;
//# sourceMappingURL=scope.js.map