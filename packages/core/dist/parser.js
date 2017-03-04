"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const promiseHelpers_1 = require("./promiseHelpers");
const binder_1 = require("./binder");
const formatters = require("./formatters");
var jsonKeyRegex = /^ *"([^"]+)"|([^\: ]+) *: */;
class ParsedString {
    constructor(value) {
        this.value = value;
        this.$$length = value.length + 2;
    }
}
exports.ParsedString = ParsedString;
class ParsedNumber {
    constructor(value) {
        this.value = Number(value);
        this.$$length = value.length;
    }
}
exports.ParsedNumber = ParsedNumber;
class ParsedBoolean {
    constructor(value) {
        this.value = Boolean(value);
        if (typeof value != 'undefined')
            this.$$length = value.toString().length;
    }
}
exports.ParsedBoolean = ParsedBoolean;
class Parser {
    static parse(expression, excludeFirstLevelFunction) {
        expression = expression.trim();
        if (['{', '[', '"', "'"].indexOf(expression[0]) != -1 && ['{', '[', '"', "'"].lastIndexOf(expression[expression.length - 1])) {
            return Parser.parseAny(expression, excludeFirstLevelFunction);
        }
        return Parser.parseEval(expression);
    }
    static parseAny(expression, excludeFirstLevelFunction) {
        switch (expression[0]) {
            case '{':
                return Parser.parseObject(expression, excludeFirstLevelFunction);
            case '[':
                return Parser.parseArray(expression, excludeFirstLevelFunction);
            case '"':
            case "'":
                return Parser.parseString(expression, expression[0]);
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '.':
                return Parser.parseNumber(expression);
            default:
                return Parser.parseEval(expression);
        }
    }
    static parseNumber(expression) {
        return new ParsedNumber(/^[0-9.]/.exec(expression)[0]);
    }
    static parseBoolean(expression) {
        var formatter = formatters.identity;
        if (expression[0] == '!') {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        var result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
        if (formatter !== formatters.identity)
            result.value = formatter(result.value);
        return result;
    }
    static parseEval(expression) {
        var b = Parser.parseBoolean(expression);
        if (b.$$length > 0)
            return b;
        return Parser.parseFunction(expression);
    }
    static parseFunction(expression) {
        var formatter = formatters.identity;
        if (expression[0] == '!') {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        var item = /^[\w0-9\.]+/.exec(expression)[0];
        var parts = Parser.parseBindable(expression);
        var f = function (value, asBinding) {
            if (asBinding) {
                if (promiseHelpers_1.isPromiseLike(value)) {
                    var binding = new binder_1.PromiseBinding(item, value);
                    binding['$$length'] = item.length;
                    binding.formatter = formatter;
                    return binding;
                }
                var binding = new binder_1.Binding(item, value);
                binding['$$length'] = item.length;
                binding.formatter = formatter;
                return binding;
            }
            for (var i = 0; i < parts.length && value; i++) {
                value = value[parts[i]];
                if (promiseHelpers_1.isPromiseLike(value)) {
                    if (value instanceof promiseHelpers_1.Deferred && value.$$status == promiseHelpers_1.PromiseStatus.Resolved) {
                        value = value.$$value;
                    }
                    else {
                        var promise;
                        if (i == parts.length - 1)
                            promise = value;
                        else
                            promise = value.then(Parser.parseFunction(parts.slice(i + 1).join('.'))).then(formatter);
                        promise['$$length'] = item.length;
                        return promise;
                    }
                }
            }
            return value;
        };
        f.$$length = item.length;
        return f;
    }
    static tryParseOperator(expression, lhs) {
        var operator = /^ *[<>=!]+ */.exec(expression)[0];
        if (operator) {
            expression = expression.substring(operator.length);
            var rhs = Parser.parseAny(expression, false);
            if (lhs instanceof Function || rhs instanceof Function) {
                var item = function (value, asBinding) {
                    if (asBinding) {
                        var left, right;
                        if (lhs instanceof Function)
                            left = lhs(value, asBinding);
                        else if (lhs instanceof ParsedString)
                            left = lhs.value;
                        else if (lhs instanceof ParsedNumber)
                            left = lhs.value;
                        else if (lhs instanceof Array)
                            left = lhs;
                        else if (lhs instanceof Object)
                            left = lhs;
                        if (rhs instanceof Function)
                            right = rhs(value, asBinding);
                        else if (rhs instanceof ParsedString)
                            right = rhs.value;
                        else if (rhs instanceof ParsedNumber)
                            right = rhs.value;
                        else if (rhs instanceof Array)
                            right = rhs;
                        else if (rhs instanceof Object)
                            right = rhs;
                        var binding = new binder_1.Binding(null, null, false);
                        if (left instanceof binder_1.Binding)
                            left.pipe(binding);
                        if (right instanceof binder_1.Binding)
                            right.pipe(binding);
                        binding['$$length'] = left['$$length'] + right['$$length'] + operator.length;
                        binding.formatter = function () {
                            var fleft, fright;
                            if (left instanceof binder_1.Binding)
                                fleft = left.getValue();
                            else
                                fleft = left;
                            if (right instanceof binder_1.Binding)
                                fright = right.getValue();
                            else
                                fright = right;
                            return Parser.operate(operator.trim(), fleft, fright);
                        };
                        return binding;
                    }
                    else
                        return Parser.operate(operator.trim(), left, right);
                };
                item.$$length = lhs.$$length + operator.length + rhs.$$length;
                return item;
            }
            else {
                var left, right;
                if (lhs instanceof ParsedString)
                    left = lhs.value;
                else if (lhs instanceof ParsedNumber)
                    left = lhs.value;
                else if (lhs instanceof Array)
                    left = lhs;
                else if (lhs instanceof Object)
                    left = lhs;
                if (rhs instanceof ParsedString)
                    right = rhs.value;
                else if (rhs instanceof ParsedNumber)
                    right = rhs.value;
                else if (rhs instanceof Array)
                    right = rhs;
                else if (rhs instanceof Object)
                    right = rhs;
                return Parser.operate(operator.trim(), left, right);
            }
        }
        else
            return lhs;
    }
    static parseArray(expression, excludeFirstLevelFunction) {
        var results = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        var isFunction = false;
        return Parser.parseCSV(expression, function (result) {
            var item = Parser.parseAny(result, false);
            item = Parser.tryParseOperator(result.substring(item.$$length), item);
            if (item instanceof ParsedString)
                results.push(item.value);
            else
                results.push(item);
            // results.$$length += item.$$length;
            return item;
        }, ']', results, excludeFirstLevelFunction);
    }
    static parseString(expression, start) {
        var evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        var result = evaluatedRegex[1];
        return new ParsedString(result);
    }
    static operate(operator, left, right) {
        // if (arguments.length == 1)
        //     return function (left: any, right: any)
        //     {
        //         return Parser.operate(operator, left, right);
        //     }
        switch (operator) {
            case '==':
                return left == right;
            case '===':
                return left === right;
            case '<':
                return left < right;
            case '<=':
                return left <= right;
            case '>':
                return left > right;
            case '>=':
                return left >= right;
            case '!=':
                return left != right;
            case '!==':
                return left !== right;
            default:
                throw new Error('invalid operator' + operator);
        }
    }
    static parseCSV(expression, parseItem, end, output, excludeFirstLevelFunction) {
        expression = expression.substring(1);
        output.$$length++;
        var isFunction = false;
        do {
            var item = parseItem(expression);
            if (item instanceof Function)
                isFunction = true;
            expression = expression.substring(item.$$length);
            var next = /^ *, */.exec(expression);
            // console.log(expression)
            if (!next)
                break;
            expression = expression.substring(next[0].length);
            // console.log(expression);
            output.$$length += next[0].length;
        } while (expression[0] != end);
        output.$$length += end.length;
        // console.log(output.$$length);
        var result;
        if (output instanceof Array)
            result = [];
        else
            result = {};
        if (isFunction && !excludeFirstLevelFunction) {
            var f = function (value, asBinding) {
                for (var i in output) {
                    if (output[i] instanceof Function)
                        result[i] = output[i](value, asBinding);
                    else
                        result[i] = output[i];
                }
                return result;
            };
            f.$$length = output.$$length;
            return f;
        }
        else
            return output;
    }
    static parseObject(expression, excludeFirstLevelFunction) {
        var keyMatch;
        var result = {};
        Object.defineProperty(result, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        return Parser.parseCSV(expression, function (expression) {
            // var length = 0;
            var keyMatch = jsonKeyRegex.exec(expression);
            var key = keyMatch[1] || keyMatch[2];
            //console.log(keyMatch);
            var length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            var item = Parser.parseAny(expression, false);
            length += item.$$length;
            if (item instanceof ParsedString)
                result[key] = item.value;
            else
                result[key] = item;
            // expression = expression.substring(result[key].$$length);
            item.$$length = length;
            // result.$$length += length;
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}', result, excludeFirstLevelFunction);
    }
    static parseBindable(expression) {
        return expression.split('.');
    }
    static getSetter(expression, root) {
        var target = root;
        var parts = Parser.parseBindable(expression);
        while (parts.length > 1 && typeof (target) != 'undefined') {
            target = Parser.eval(parts[0], target);
            parts.shift();
        }
        if (typeof (target) == 'undefined')
            return null;
        return { expression: parts[0], target: target, set: function (value) { target[parts[0]] = value; } };
    }
    static evalAsFunction(expression, excludeFirstLevelFunction) {
        var parts = Parser.parse(expression, excludeFirstLevelFunction);
        if (parts instanceof Array)
            return Parser.parseFunction(expression);
        return parts;
    }
    static eval(expression, value) {
        return Parser.evalAsFunction(expression, false)(value, false);
    }
}
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map