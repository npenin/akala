import { Deferred, isPromiseLike, PromiseStatus } from './promiseHelpers';
import { Binding, PromiseBinding } from './binder';
import * as formatters from './formatters';


var jsonKeyRegex = /^ *"([^"]+)"|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

export type ParsedOneOf = ParsedObject | ParsedArray | ParsedFunction | ParsedString | ParsedBoolean | ParsedNumber;

export interface ParsedObject extends ParsedAny
{
    [name: string]: any;
}

export interface ParsedArray extends ParsedAny, Array<ParsedAny>
{
}

export interface ParsedFunction extends ParsedAny
{
    (value: any, asBinding?: false): any;
    (value: any, asBinding: true): Binding;
}

export class ParsedString implements ParsedAny
{
    constructor(public value: string)
    {
        this.$$length = value.length + 2;
    }

    public $$length: number;
}

export class ParsedNumber implements ParsedAny
{
    constructor(value: string)
    {
        this.value = Number(value);
        this.$$length = value.length;
    }

    public value: number;

    public $$length: number;
}

export class ParsedBoolean implements ParsedAny
{
    constructor(value: string)
    {
        this.value = Boolean(value);
        if (typeof value != 'undefined')
            this.$$length = value.toString().length;
    }

    public value: boolean;

    public $$length: number;
}

export class Parser
{
    public static parse(expression: string, excludeFirstLevelFunction: boolean): ParsedFunction | ParsedAny
    {
        expression = expression.trim();
        if (['{', '[', '"', "'"].indexOf(expression[0]) != -1 && ['{', '[', '"', "'"].lastIndexOf(expression[expression.length - 1]))
        {
            return Parser.parseAny(expression, excludeFirstLevelFunction);
        }
        return Parser.parseEval(expression);
    }

    public static parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedOneOf
    {
        switch (expression[0])
        {
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

    public static parseNumber(expression): ParsedNumber
    {
        return new ParsedNumber(/^[0-9.]/.exec(expression)[0]);
    }

    public static parseBoolean(expression): ParsedBoolean
    {
        var formatter = formatters.identity;
        if (expression[0] == '!')
        {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }

        var result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
        if (formatter !== formatters.identity)
            result.value = formatter(result.value);
        return result;
    }

    public static parseEval(expression: string): ParsedBoolean | ParsedFunction
    {
        var b = Parser.parseBoolean(expression);
        if (b.$$length > 0)
            return b;

        return Parser.parseFunction(expression);
    }

    private static parseFunction(expression: string): ParsedFunction
    {
        var formatter = formatters.identity;
        if (expression[0] == '!')
        {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        var item = /^[\w0-9\.]+/.exec(expression)[0];
        var parts = Parser.parseBindable(expression);

        var f: ParsedFunction = function (value, asBinding?: boolean)
        {
            if (asBinding)
            {
                if (isPromiseLike(value))
                {
                    var binding = new PromiseBinding(item, value);
                    binding['$$length'] = item.length;
                    binding.formatter = formatter;
                    return binding;
                }
                var binding = new Binding(item, value);
                binding['$$length'] = item.length;
                binding.formatter = formatter;
                return binding;
            }

            for (var i = 0; i < parts.length && value; i++)
            {
                value = value[parts[i]];
                if (isPromiseLike(value))
                {
                    if (value instanceof Deferred && value.$$status == PromiseStatus.Resolved)
                    {
                        value = value.$$value;
                    }
                    else
                    {
                        var promise: PromiseLike<any>;
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
        }
        f.$$length = item.length;

        return f;
    }

    public static tryParseOperator(expression: string, lhs: ParsedOneOf)
    {
        var operator = /^ *[<>=!]+ */.exec(expression)[0];
        if (operator)
        {
            expression = expression.substring(operator.length);
            var rhs = Parser.parseAny(expression, false);
            if (lhs instanceof Function || rhs instanceof Function)
            {
                var item: ParsedFunction = function (value: any, asBinding: boolean)
                {
                    if (asBinding)
                    {
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
                            right = rhs

                        var binding = new Binding(null, null, false);
                        if (left instanceof Binding)
                            left.pipe(binding);
                        if (right instanceof Binding)
                            right.pipe(binding);
                        binding['$$length'] = left['$$length'] + right['$$length'] + operator.length;
                        binding.formatter = function ()
                        {
                            var fleft, fright;
                            if (left instanceof Binding)
                                fleft = left.getValue();
                            else
                                fleft = left;
                            if (right instanceof Binding)
                                fright = right.getValue();
                            else
                                fright = right;
                            return Parser.operate(operator.trim(), fleft, fright);
                        }
                        return binding;
                    }
                    else
                        return <any>Parser.operate(operator.trim(), left, right);
                }
                item.$$length = lhs.$$length + operator.length + rhs.$$length;
                return item;
            }
            else
            {
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
                    right = rhs

                return Parser.operate(operator.trim(), left, right);
            }
        }
        else
            return lhs;
    }

    public static parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction
    {
        var results: ParsedArray = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        var isFunction = false;
        return Parser.parseCSV(expression, function (result)
        {
            var item: ParsedAny = Parser.parseAny(result, false);
            item = Parser.tryParseOperator(result.substring(item.$$length), item)
            if (item instanceof ParsedString)
                results.push(item.value);
            else

                results.push(item);
            // results.$$length += item.$$length;
            return item;
        }, ']', results, excludeFirstLevelFunction);
    }

    public static parseString(expression: string, start: string): ParsedString
    {
        var evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        var result = evaluatedRegex[1];
        return new ParsedString(result);
    }

    public static operate(operator: string, left?: any, right?: any)
    {
        // if (arguments.length == 1)
        //     return function (left: any, right: any)
        //     {
        //         return Parser.operate(operator, left, right);
        //     }
        switch (operator)
        {
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

    private static parseCSV<T extends ParsedAny>(expression: string, parseItem: (expression: string) => ParsedAny, end: string, output: T, excludeFirstLevelFunction: boolean): ParsedFunction | T
    {
        expression = expression.substring(1);
        output.$$length++;
        var isFunction = false;
        do
        {
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
        }
        while (expression[0] != end);
        output.$$length += end.length;
        // console.log(output.$$length);
        var result: any;
        if (output instanceof Array)
            result = [];
        else
            result = {};
        if (isFunction && !excludeFirstLevelFunction)
        {
            var f: ParsedFunction = function (value, asBinding: boolean)
            {
                for (var i in output)
                {
                    if (output[i] instanceof Function)
                        result[i] = (<Function><any>output[i])(value, asBinding);
                    else
                        result[i] = output[i];
                }
                return result;
            }
            f.$$length = output.$$length;
            return f;
        }
        else
            return output;
    }

    public static parseObject(expression: string, excludeFirstLevelFunction?: boolean)
    {
        var keyMatch: RegExpExecArray;
        var result: ParsedObject = {};
        Object.defineProperty(result, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        return Parser.parseCSV(expression, function (expression)
        {
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

    public static parseBindable(expression: string)
    {
        return expression.split('.');
    }

    public static getSetter(expression: string, root: any)
    {
        var target = root;
        var parts = Parser.parseBindable(expression);

        while (parts.length > 1 && typeof (target) != 'undefined')
        {
            target = Parser.eval(parts[0], target);
            parts.shift();
        }
        if (typeof (target) == 'undefined')
            return null;

        return { expression: parts[0], target: target, set: function (value) { target[parts[0]] = value } };
    }

    public static evalAsFunction(expression: string, excludeFirstLevelFunction?: boolean)
    {
        var parts = Parser.parse(expression, excludeFirstLevelFunction);
        if (parts instanceof Array)
            return Parser.parseFunction(expression);

        return <ParsedFunction>parts;
    }

    public static eval(expression: string, value: any)
    {
        return Parser.evalAsFunction(expression, false)(value, false);
    }
}