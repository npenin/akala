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
const showdown = require("showdown");
const text_1 = require("./text");
let Markdown = class Markdown extends text_1.Text {
    constructor() {
        super('markdown');
        this.markdown = new showdown.Converter();
    }
    link(target, element, parameter) {
        if (parameter instanceof core_1.Binding) {
            parameter.formatter = this.markdown.makeHtml.bind(this.markdown);
        }
        super.link(target, element, parameter);
    }
    setValue(element, value) {
        element.html(this.markdown.makeHtml(value));
    }
};
Markdown = __decorate([
    control_1.control()
], Markdown);
exports.Markdown = Markdown;
//# sourceMappingURL=markdown.js.map