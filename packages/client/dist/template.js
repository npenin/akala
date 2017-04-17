"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
require("@akala/core");
const di = require("@akala/core");
const controls_1 = require("./controls/controls");
const scope_1 = require("./scope");
const common_1 = require("./common");
if (MutationObserver) {
    var domObserver = new MutationObserver(function (mutations) {
        mutations.forEach(function (mutation) {
            switch (mutation.type) {
                case 'characterData':
                    return;
                case 'attributes':
                case 'childList':
            }
        });
    });
}
let Interpolate = Interpolate_1 = class Interpolate {
    get startSymbol() { return Interpolate_1._startSymbol; }
    ;
    set startSymbol(value) { Interpolate_1._startSymbol = value; }
    ;
    get endSymbol() { return Interpolate_1._endSymbol; }
    ;
    set endSymbol(value) { Interpolate_1._endSymbol = value; }
    ;
    static unescapeText(text) {
        return text.replace(this.escapedStartRegexp, Interpolate_1._startSymbol).
            replace(this.escapedEndRegexp, Interpolate_1._endSymbol);
    }
    static escape(ch) {
        return '\\\\\\' + ch;
    }
    static build(text, mustHaveExpression, trustedContext, allOrNothing) {
        var startSymbolLength = Interpolate_1._startSymbol.length, endSymbolLength = Interpolate_1._endSymbol.length;
        if (!text.length || text.indexOf(Interpolate_1._startSymbol) === -1) {
            var constantInterp;
            if (!mustHaveExpression) {
                return function (target) {
                    return text;
                };
            }
            return constantInterp;
        }
        allOrNothing = !!allOrNothing;
        var startIndex, endIndex, index = 0, expressions = [], parseFns = [], textLength = text.length, exp, concat = [], expressionPositions = [];
        while (index < textLength) {
            if (((startIndex = text.indexOf(Interpolate_1._startSymbol, index)) !== -1) &&
                ((endIndex = text.indexOf(Interpolate_1._endSymbol, startIndex + startSymbolLength)) !== -1)) {
                if (index !== startIndex) {
                    concat.push(this.unescapeText(text.substring(index, startIndex)));
                }
                exp = text.substring(startIndex + startSymbolLength, endIndex);
                expressions.push(exp);
                parseFns.push(function (target) {
                    return new di.Binding(exp, target);
                });
                index = endIndex + endSymbolLength;
                expressionPositions.push(concat.length);
                concat.push('');
            }
            else {
                // we did not find an interpolation, so we have to add the remainder to the separators array
                if (index !== textLength) {
                    concat.push(this.unescapeText(text.substring(index)));
                }
                break;
            }
        }
        var compute = function (values) {
            for (var i = 0, ii = expressions.length; i < ii; i++) {
                if (allOrNothing && typeof (values[i]))
                    return;
                concat[expressionPositions[i]] = values[i].getValue();
            }
            return concat.join('');
        };
        return function interpolationFn(target) {
            var bindings = [];
            for (var i = 0; i < expressions.length; i++) {
                bindings[i] = parseFns[i](target);
            }
            return compute(bindings);
        };
    }
};
Interpolate._startSymbol = '{{';
Interpolate._endSymbol = '}}';
Interpolate.escapedStartRegexp = new RegExp(Interpolate_1._startSymbol.replace(/./g, Interpolate_1.escape), 'g');
Interpolate.escapedEndRegexp = new RegExp(Interpolate_1._endSymbol.replace(/./g, Interpolate_1.escape), 'g');
Interpolate = Interpolate_1 = __decorate([
    common_1.service('$interpolate')
], Interpolate);
exports.Interpolate = Interpolate;
var cache = new di.Injector();
let Template = Template_1 = class Template {
    constructor(interpolator, http) {
        this.interpolator = interpolator;
        this.http = http;
    }
    get(t, registerTemplate = true) {
        var http = this.http;
        var self = this;
        var p = new di.Deferred();
        if (!t)
            setImmediate(p.resolve, t);
        else {
            var template = cache.resolve(t);
            if (template) {
                if (di.isPromiseLike(template))
                    return template.then(function (data) {
                        p.resolve(data);
                        return data;
                    });
                else
                    setImmediate(p.resolve.bind(p), template);
            }
            else if (/</.test(t)) {
                var template = Template_1.build(t);
                setImmediate(p.resolve.bind(p), template);
            }
            else {
                cache.register(t, p);
                http.get(t).then(function (data) {
                    var template = Template_1.build(data);
                    if (registerTemplate)
                        cache.register(t, template, true);
                    p.resolve(template);
                }, p.reject.bind(p));
            }
        }
        return p;
    }
    static build(markup) {
        var template = Interpolate.build(markup);
        return function (data, parent) {
            var templateInstance = $(template(data));
            if (parent)
                templateInstance.appendTo(parent);
            return templateInstance.applyTemplate(data, parent);
        };
    }
};
Template = Template_1 = __decorate([
    common_1.service('$template', '$interpolate', '$http')
], Template);
exports.Template = Template;
var databindRegex = /(\w+):([^;]+);?/g;
$.extend($.fn, {
    applyTemplate: function applyTemplate(data, root) {
        data.$new = scope_1.Scope.prototype.$new;
        if (this.filter('[data-bind]').length == 0) {
            this.find('[data-bind]').each(function () {
                var closest = $(this).parent().closest('[data-bind]');
                var applyInnerTemplate = closest.length == 0;
                if (!applyInnerTemplate && root)
                    root.each(function (i, it) { applyInnerTemplate = applyInnerTemplate || it == closest[0]; });
                if (applyInnerTemplate)
                    $(this).applyTemplate(data, this);
            });
            return this;
        }
        else {
            var element = $();
            var promises = [];
            this.filter('[data-bind]').each(function (index, item) {
                var $item = $(item);
                var subElem = controls_1.Control.apply(di.Parser.evalAsFunction($item.attr("data-bind"), true), $item, data);
                if (di.isPromiseLike(subElem)) {
                    promises.push(subElem.then(function (subElem) {
                        element = element.add(subElem);
                    }));
                }
                else
                    element = element.add(subElem);
            });
            if (promises.length)
                return $.when(promises).then(function () {
                    return element;
                });
            return element;
        }
    },
    tmpl: function (data, options) {
        if (this.length > 1)
            throw 'A template can only be a single item';
        if (this.length == 0)
            return null;
        return Template.build(this[0]);
    }
});
var Interpolate_1, Template_1;
//# sourceMappingURL=template.js.map