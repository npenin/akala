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
let Value = class Value extends control_1.BaseControl {
    constructor() {
        super('value', 400);
    }
    link(target, element, parameter) {
        if (parameter instanceof di.Binding) {
            element.change(function () {
                parameter.setValue($(this).val(), parameter);
            });
            parameter.onChanged(function (target) {
                element.val(target.eventArgs.value);
            });
        }
        else
            element.val(parameter);
    }
};
Value = __decorate([
    control_1.control()
], Value);
exports.Value = Value;
//# sourceMappingURL=value.js.map