"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("akala-core");
const control_1 = require("./control");
let ForEach = ForEach_1 = class ForEach extends control_1.Control {
    constructor() {
        super('each', 100);
    }
    instanciate(target, element, parameter) {
        if (typeof (parameter) == 'string') {
            parameter = this.parse(parameter);
        }
        var source = di.Parser.eval(parameter.in, target);
        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        return di.Promisify(source).then(function (source) {
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
                            if (parameter.key)
                                scope[parameter.key] = source.length - 1;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = 0;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = source.indexOf(args.newItems[0]);
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            $.each(source, function (key, value) {
                var scope = target.$new();
                if (parameter.key)
                    scope[parameter.key] = key;
                if (parameter.value)
                    scope[parameter.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        });
    }
    parse(exp) {
        var result = ForEach_1.expRegex.exec(exp).slice(1);
        return { in: result[2], key: result[1] && result[0], value: result[1] || result[0] };
    }
};
ForEach.expRegex = /^\s*\(?(\w+)(?:, (\w+))?\)?\s+in\s+(\w+)\s*/;
ForEach = ForEach_1 = __decorate([
    control_1.control()
], ForEach);
exports.ForEach = ForEach;
var ForEach_1;
//# sourceMappingURL=foreach.js.map