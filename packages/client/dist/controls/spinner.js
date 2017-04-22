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
let Spinner = class Spinner extends control_1.Control {
    constructor() {
        super('spinner', 50);
    }
    instanciate(target, element, parameter) {
        var parent = element.parent();
        var wrapped = this.wrap(element, target, true);
        var settings = {};
        if (Array.isArray(parameter))
            settings.classes = parameter;
        else
            settings.classes = parameter.classes || 'fa fa-spin fa-3x fa-circle-o-notch';
        if (wrapped != element && di.isPromiseLike(wrapped)) {
            var spinner;
            if (element[0].tagName.toLowerCase() == 'tr') {
                spinner = $('<tr class="spinner"><td colspan="99"></td></tr>').appendTo(parent);
                parent = spinner.find('td');
            }
            spinner = $('<span class="spinner"></span>');
            spinner.addClass(settings.classes);
            spinner.appendTo(parent);
            wrapped.then(function () {
                spinner.remove();
            });
        }
        return wrapped;
    }
};
Spinner = __decorate([
    control_1.control()
], Spinner);
exports.Spinner = Spinner;
//# sourceMappingURL=spinner.js.map