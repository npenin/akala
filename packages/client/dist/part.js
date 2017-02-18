"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("akala-core");
const events_1 = require("events");
const common_1 = require("./common");
let Part = class Part extends events_1.EventEmitter {
    constructor(template, router) {
        super();
        this.template = template;
        this.router = router;
        this.parts = new di.Injector();
    }
    register(partName, control) {
        this.parts.register(partName, control);
    }
    use(url, partName = 'body', part) {
        var parts = this.parts;
        var template = this.template;
        this.router.use(url, function (req, res, next) {
            if (part.template)
                template.get(part.template).then(function (template) {
                    var p = parts.resolve(partName);
                    if (!p)
                        return;
                    if (part.controller)
                        part.controller(p.scope, p.element, req.params);
                    if (template)
                        di.Promisify(template(p.scope)).then(function (tmpl) {
                            tmpl.appendTo(p.element.empty());
                        });
                });
            else {
                debugger;
                var p = parts.resolve(partName);
                if (!p)
                    return;
                if (part.controller)
                    part.controller(p.scope, p.element, req.params);
                next();
            }
        });
    }
};
Part = __decorate([
    common_1.service('$part', '$template', '$router')
], Part);
exports.Part = Part;
//# sourceMappingURL=part.js.map