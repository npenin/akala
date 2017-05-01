"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const control_1 = require("./control");
let ForEach = ForEach_1 = class ForEach extends control_1.Control {
    constructor(name) {
        super(name || 'each', 100);
    }
    instanciate(target, element, parameter) {
        if (typeof (parameter) == 'string')
            parameter = this.parse(parameter);
        var parsedParam = parameter;
        if (parameter.in instanceof Function)
            var sourceBinding = parameter.in(target, true);
        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        function build(source) {
            var result = $();
            if (source instanceof di.ObservableArray) {
                source.on('collectionChanged', function (args) {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action) {
                        case 'init':
                            break;
                        case 'shift':
                            parent.eq(0).remove();
                            break;
                        case 'pop':
                            parent.eq(source.length).remove();
                            break;
                        case 'push':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.length - 1;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = 0;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            $.each(source, function (key, value) {
                var scope = target.$new();
                if (parsedParam.key)
                    scope[parsedParam.key] = key;
                if (parsedParam.value)
                    scope[parsedParam.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        }
        sourceBinding.onChanged(function (ev) {
            di.Promisify(ev.eventArgs.value).then(build);
        }, true);
        return di.Promisify(sourceBinding.getValue()).then(build);
    }
    parse(exp) {
        var result = ForEach_1.expRegex.exec(exp);
        return { in: di.Parser.evalAsFunction(exp.substring(result[0].length)), key: result[2] && result[1], value: result[2] || result[1] };
    }
};
ForEach.expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;
ForEach = ForEach_1 = __decorate([
    control_1.control()
], ForEach);
exports.ForEach = ForEach;
var ForEach_1;
//# sourceMappingURL=foreach.js.map