"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const akala_core_1 = require("akala-core");
let CssClass = class CssClass extends control_1.BaseControl {
    constructor() {
        super('class', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof Array) {
            new akala_core_1.ObservableArray(parameter).on('collectionChanged', function (arg) {
                for (var i in arg.newItems) {
                    if (typeof (arg.newItems[i]) == 'string')
                        element.addClass(arg.newItems[i]);
                    else {
                        if (arg.newItems[i] instanceof akala_core_1.Binding) {
                            arg.newItems[i].onChanged(function (target, eventArgs) {
                                element.addClass(arg.newItems[i].getValue());
                            });
                            // element.text(parameter.getValue());
                        }
                        else
                            element.addClass(arg.newItems[i]);
                    }
                }
            }).init();
        }
        else {
            Object.keys(parameter).forEach(function (key) {
                parameter[key].onChanged(function (ev) {
                    element.toggleClass(key, ev.eventArgs.value);
                });
                element.toggleClass(key, parameter[key].getValue());
            });
        }
    }
};
CssClass = __decorate([
    control_1.control()
], CssClass);
exports.CssClass = CssClass;
//# sourceMappingURL=cssClass.js.map