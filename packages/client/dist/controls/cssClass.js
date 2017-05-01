"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
const core_1 = require("@akala/core");
let CssClass = class CssClass extends control_1.BaseControl {
    constructor() {
        super('class', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof Array) {
            parameter = new core_1.ObservableArray(parameter);
        }
        if (parameter instanceof core_1.ObservableArray)
            parameter.on('collectionChanged', function (arg) {
                arg.newItems.forEach(function (item) {
                    if (typeof (item) == 'string')
                        element.addClass(item);
                    else {
                        if (item instanceof core_1.Binding) {
                            var oldValue = null;
                            item.onChanged(function (ev) {
                                if (oldValue)
                                    element.removeClass(oldValue);
                                element.addClass(ev.eventArgs.value);
                                oldValue = ev.eventArgs.value;
                            });
                        }
                        else
                            Object.keys(item).forEach(function (key) {
                                if (item[key] instanceof core_1.Binding) {
                                    item[key].onChanged(function (ev) {
                                        element.toggleClass(key, ev.eventArgs.value);
                                    });
                                }
                                else
                                    element.toggleClass(key, item[key]);
                            });
                    }
                });
            }).init();
        else {
            Object.keys(parameter).forEach(function (key) {
                if (parameter[key] instanceof core_1.Binding) {
                    parameter[key].onChanged(function (ev) {
                        element.toggleClass(key, ev.eventArgs.value);
                    });
                }
                else
                    element.toggleClass(key, parameter[key]);
            });
        }
    }
};
CssClass = __decorate([
    control_1.control()
], CssClass);
exports.CssClass = CssClass;
//# sourceMappingURL=cssClass.js.map