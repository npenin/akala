"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
var registeredControls = [];
function control(...toInject) {
    return function (ctrl) {
        if (registeredControls.length == 0)
            Control.injector.init([], function () {
                registeredControls.forEach(function (ctrl) {
                    di.injectNewWithName(ctrl[0], ctrl[1])();
                });
            });
        registeredControls.push([toInject, ctrl]);
    };
}
exports.control = control;
class Control {
    constructor($$name, priority = 500) {
        this.$$name = $$name;
        this.priority = priority;
        Control.injector.register($$name, this);
    }
    static apply(controls, element, scope) {
        var applicableControls = [];
        var requiresNewScope = false;
        Object.keys(controls).forEach(function (key) {
            var control;
            applicableControls.push(control = Control.injector.resolve(key));
            if (control.scope)
                requiresNewScope = true;
        });
        applicableControls.sort(function (a, b) { return a.priority - b.priority; });
        if (!scope)
            scope = element.data('$scope');
        if (requiresNewScope) {
            scope = scope.$new();
            element.data('$scope', scope);
        }
        for (var control of applicableControls) {
            var controlSettings = controls[control.$$name];
            if (controlSettings instanceof Function)
                controlSettings = controlSettings(scope, true);
            var newElem = control.instanciate(scope, element, controlSettings, controls);
            if (newElem) {
                return newElem;
            }
        }
        ;
        element.find('[data-bind]').each(function () {
            if ($(this).parent().closest('[data-bind]')[0] == element[0])
                $(this).applyTemplate(scope, element);
        });
        return element;
    }
    wrap(element, scope, newControls) {
        if (newControls) {
            var controls = di.Parser.parse(element.attr('data-bind'), true);
            var applicableControls = [];
            Object.keys(controls).forEach(function (key) {
                applicableControls.push(Control.injector.resolve(key));
            });
            applicableControls.sort(function (a, b) { return a.priority - b.priority; });
            applicableControls = applicableControls.slice(applicableControls.indexOf(this) + 1);
            newControls = {};
            applicableControls.forEach(function (control) {
                newControls[control.$$name] = controls[control.$$name];
            });
        }
        return Control.apply(newControls, element, scope);
    }
    clone(element, scope, newControls) {
        var clone = element.clone();
        clone.data('$scope', scope);
        this.wrap(clone, scope, newControls);
        return clone;
    }
}
Control.injector = di.module('controls', 'akala-services');
exports.Control = Control;
class BaseControl extends Control {
    constructor(name, priority) {
        super(name, priority);
    }
    instanciate(scope, element, parameter) {
        var self = this;
        di.Promisify(scope).then(function (scope) {
            di.Promisify(parameter).then(function (parameter) {
                self.link(scope, element, parameter);
            });
        });
    }
}
exports.BaseControl = BaseControl;
//# sourceMappingURL=control.js.map