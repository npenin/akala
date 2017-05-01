"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const control_1 = require("./control");
let Hide = class Hide extends control_1.BaseControl {
    constructor() {
        super('hide', 400);
    }
    link(target, element, parameter) {
        parameter.onChanged(function (ev) {
            element.toggle(!ev.eventArgs.value);
        });
    }
};
Hide = __decorate([
    control_1.control()
], Hide);
exports.Hide = Hide;
let Show = class Show extends control_1.BaseControl {
    constructor() {
        super('show', 400);
    }
    link(target, element, parameter) {
        parameter.onChanged(function (ev) {
            element.toggle(ev.eventArgs.value);
        });
    }
};
Show = __decorate([
    control_1.control()
], Show);
exports.Show = Show;
//# sourceMappingURL=visibility.js.map