"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var parser_1 = require('./parser');
var events_1 = require('events');
var Binding = (function (_super) {
    __extends(Binding, _super);
    function Binding(expression, target) {
        _super.call(this);
        this.expression = expression;
        this.target = target;
    }
    Binding.prototype.getValue = function () {
        var parts = this.expression.split('.');
        var value = this.target;
        for (var i = 0; i < parts.length; i++) {
            value = value[parts[i]];
        }
        return value;
    };
    /*apply(elements, doNotRegisterEvents)
    {
        var val = this.getValue();
        var inputs = elements.filter(':input').val(val)
        var binding = this;
        if (!doNotRegisterEvents)
            inputs.change(function ()
            {
                binding.setValue($(this).val(), this);
            });
        elements.filter(':not(:input))').text(val);
    }*/
    Binding.setValue = function (target, parts, value, source) {
        while (parts.length > 1) {
            target = parser_1.Parser.eval(parts[0], target);
            parts.shift();
        }
        return target;
    };
    Binding.prototype.setValue = function (value, source, doNotTriggerEvents) {
        var target = this.target;
        var parts = this.expression.split(".");
        if (parts.length > 1) {
            try {
                Binding.setValue(target, parts, value, source);
            }
            catch (ex) {
                this.emit(Binding.eventNameBindingError, {
                    target: target,
                    field: this.expression,
                    Exception: ex
                });
            }
        }
        try {
            var eventArgs = {
                cancel: false,
                fieldName: parts[0],
                source: source
            };
            if (!doNotTriggerEvents)
                this.emit(Binding.eventNameChangingField, {
                    target: target,
                    eventArgs: eventArgs
                });
            if (eventArgs.cancel)
                return;
            target[parts[0]] = value;
            if (!doNotTriggerEvents)
                this.emit(Binding.eventNameChangedField, {
                    target: target,
                    eventArgs: {
                        fieldName: parts[0]
                    },
                    source: source
                });
        }
        catch (ex) {
            this.emit(Binding.eventNameBindingError, {
                target: target,
                field: this.expression,
                Exception: ex,
                source: source
            });
        }
    };
    ;
    Binding.eventNameChangingField = "fieldChanging";
    Binding.eventNameChangedField = "fieldChanged";
    Binding.eventNameBindingError = "bindingError";
    return Binding;
}(events_1.EventEmitter));
exports.Binding = Binding;
//# sourceMappingURL=binder.js.map