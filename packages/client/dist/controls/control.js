"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("akala-core");
function control(...toInject) {
    return function (ctrl) {
        Control.injector.init([], di.injectNewWithName(toInject, ctrl));
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
            var newElem = control.instanciate(scope, element, controlSettings);
            if (newElem) {
                return newElem;
            }
        }
        ;
        element.find('[data-bind]').each(function () {
            if ($(this).parent().closest('[data-bind]')[0] == element[0])
                $(this).applyTemplate(scope);
        });
        return element;
    }
    clone(element, scope, newControls) {
        var clone = element.clone();
        clone.data('$scope', scope);
        if (newControls) {
            var controls = di.Parser.parse(clone.attr('data-bind'), true);
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
        Control.apply(newControls, clone, scope);
        return clone;
    }
}
Control.injector = di.module('controls', 'akala-services');
exports.Control = Control;
class BaseControl extends Control {
    constructor(name, priority) {
        super(name, priority);
    }
    instanciate(target, element, parameter) {
        var self = this;
        di.Promisify(target).then(function (target) {
            di.Promisify(parameter).then(function (parameter) {
                self.link(target, element, parameter);
            });
        });
    }
}
exports.BaseControl = BaseControl;
//# sourceMappingURL=control.js.map