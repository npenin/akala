import { isPromiseLike, PromiseStatus } from './promiseHelpers';
import { Binding, PromiseBinding } from './binder';
import * as formatters from './formatters';
import { module } from './helpers';
import { FormatterFactory } from './formatters/common';


var jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^\: ]+)) *): */;
// var jsonSingleQuoteKeyRegex = /^ *'([^']+)'|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

export type ParsedOneOf = ParsedObject | ParsedArray | ParsedFunction | ParsedString | ParsedBoolean | ParsedNumber;

export class ParsedBinary implements ParsedAny
{
    constructor(public operator: '+' | '-' | '*' | '/' | '&&' | '||' | '<' | '<=' | '>' | '>=' | '.', public left: ParsedOneOf, public right: ParsedOneOf)
    {
        this.$$length = this.left.$$length + this.operator.length + this.right.$$length;
    }

    public evaluate(value: any, asBinding?: boolean)
    {
        var operation = this;
        if (asBinding)
        {
            var left, right;
            if (operation.left instanceof Function)
                left = operation.left(value, asBinding);
            else if (operation.left instanceof ParsedBinary)
                left = operation.left.evaluate(value, asBinding);
            else if (operation.left instanceof ParsedString)
                left = operation.left.value;
            else if (operation.left instanceof ParsedNumber)
                left = operation.left.value;
            else if (operation.left instanceof Array)
                left = operation.left;
            else if (operation.left instanceof Object)
                left = operation.left;

            if (operation.right instanceof Function)
                right = operation.right(value, asBinding);
            else if (operation.right instanceof ParsedBinary)
                right = operation.right.evaluate(value, asBinding);
            else if (operation.right instanceof ParsedString)
                right = operation.right.value;
            else if (operation.right instanceof ParsedNumber)
                right = operation.right.value;
            else if (operation.right instanceof Array)
                right = operation.right;
            else if (operation.right instanceof Object)
                right = operation.right

            var binding = new Binding(null, null, false);
            if (left instanceof Binding)
                left.pipe(binding);
            if (right instanceof Binding)
                right.pipe(binding);
            binding['$$length'] = operation.$$length;
            binding.getValue = function ()
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
                return Parser.operate(operation.operator, fleft, fright);
            }
            return binding;
        }
        else
        {
            var left, right;
            if (operation.left instanceof Function)
                left = operation.left(value, false);
            else if (operation.left instanceof ParsedBinary)
                left = operation.left.evaluate(value, asBinding);
            else if (operation.left instanceof ParsedString)
                left = operation.left.value;
            else if (operation.left instanceof ParsedNumber)
                left = operation.left.value;
            else if (operation.left instanceof Array)
                left = operation.left;
            else if (operation.left instanceof Object)
                left = operation.left;

            if (operation.right instanceof Function)
                right = operation.right(value, false);
            else if (operation.right instanceof ParsedBinary)
                right = operation.right.evaluate(value, asBinding);
            else if (operation.right instanceof ParsedString)
                right = operation.right.value;
            else if (operation.right instanceof ParsedNumber)
                right = operation.right.value;
            else if (operation.right instanceof Array)
                right = operation.right;
            else if (operation.right instanceof Object)
                right = operation.right;
            return <any>Parser.operate(operation.operator, left, right);
        }
    }

    public $$length: number;

    public static applyPrecedence(operation: ParsedBinary)
    {
        if (operation.operator != '+' && operation.operator != '-')
        {
            if (operation.right instanceof Function && operation.right.$$ast)
            {
                var right = ParsedBinary.applyPrecedence(operation.right.$$ast);
                switch (right.operator)
                {
                    case '+':
                    case '-':
                        break;
                    case '*': // b*(c+d) ==> (b*c)+d
                    case '/':
                    case '&&':
                    case '||':
                    case '.':
                        var left = operation.left;
                        operation.right = right.right;
                        operation.left = new ParsedBinary(operation.operator, left, right.left);
                        operation.operator = right.operator;
                        break;
                }
            }
        }
        return operation;
    }

    public toString()
    {
        return '(' + this.left.toString() + this.operator + this.right.toString() + ')';
    }
}

export interface ParsedObject extends ParsedAny
{
    [name: string]: any;
}

export interface ParsedArray extends ParsedAny, Array<ParsedAny>
{
}

export interface ParsedFunction extends ParsedAny
{
    $$ast?: ParsedBinary;
    (value: any, asBinding?: false): any;
    (value: any, asBinding: true): Binding;
    (value: any, asBinding?: boolean): any;
}

export class ParsedString implements ParsedAny
{
    constructor(public value: string)
    {
        this.$$length = value.length + 2;
    }

    public $$length: number;

    public toString()
    {
        return this.value;
    }
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
    public static parse(expression: string, excludeFirstLevelFunction: false | undefined): ParsedFunction
    public static parse(expression: string, excludeFirstLevelFunction: true): ParsedOneOf
    public static parse(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedOneOf
    public static parse(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedOneOf
    {
        expression = expression.trim();
        var result = Parser.parseAny(expression, excludeFirstLevelFunction);
        if (!excludeFirstLevelFunction && result instanceof ParsedBinary)
            return result.evaluate.bind(result);
        return result;
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

    public static parseNumber(expression): ParsedOneOf
    {
        var result = new ParsedNumber(/^[0-9.]/.exec(expression)[0]);

        return Parser.tryParseOperator(expression.substring(result.$$length), result);
    }

    public static parseBoolean(expression): ParsedBoolean
    {
        var formatter: (o: any) => any = formatters.identity;
        if (expression[0] == '!')
        {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }
        if (expression[0] == '!')
        {
            formatter = formatters.booleanize;
            expression = expression.substring(1);
        }

        if (/^true|false|undefined/.exec(expression))
        {
            var result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
            if (formatter !== formatters.identity)
                result.value = formatter(result.value);
            return result;
        }
        return null;
    }

    public static parseEval(expression: string): ParsedBoolean | ParsedFunction | ParsedBinary
    {
        var b = Parser.parseBoolean(expression);
        if (b)
            return b;

        return Parser.parseFunction(expression);
    }

    public static parseFunction(expression: string): ParsedFunction | ParsedBinary
    {
        var length = 0;
        var formatter: (o: any) => any = formatters.identity;
        if (expression[0] == '!')
        {
            formatter = formatters.negate;
            expression = expression.substring(1);
            length++;
        }
        if (expression[0] == '!')
        {
            formatter = formatters.booleanize;
            expression = expression.substring(1);
            length++;
        }

        var item = /^[\w0-9\.\$]*/.exec(expression)[0];
        length += item.length;
        var parts = Parser.parseBindable(item);

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

            if (parts.length >= 1 && parts[0] != '')
                for (var i = 0; i < parts.length && value; i++)
                {
                    value = value[parts[i]];
                    if (isPromiseLike(value))
                    {
                        var promise: PromiseLike<any>;
                        if (i == parts.length - 1)
                            promise = value;
                        else
                            promise = value.then(<ParsedFunction>Parser.parseFunction(parts.slice(i + 1).join('.'))).then(formatter);
                        promise['$$length'] = item.length;
                        return promise;
                    }
                }
            return value;
        }
        f.$$length = length;
        f = Parser.tryParseOperator(expression.substr(item.length), f);

        return f;
    }

    public static parseFormatter(expression: string, lhs: ParsedOneOf): ParsedOneOf
    {
        var item = /^ *# *([\w0-9\.\$]+) */.exec(expression);
        expression = expression.substring(item[0].length);
        var formatter: FormatterFactory<any, any> = module('$formatters').resolve('#' + item[1]);
        if (!formatter)
            throw new Error(`filter not found: ${item[1]}`)
        var settings: ParsedObject;
        if (expression[0] == ':')
        {
            settings = formatter.parse(expression.substring(1));
        }

        var result: ParsedFunction = function (value, asBinding?: boolean)
        {
            var left;
            if (lhs instanceof Function)
                left = lhs(value, asBinding);
            else if (lhs instanceof ParsedBinary)
                left = lhs.evaluate(value, asBinding);
            else if (lhs instanceof ParsedString)
                left = lhs.value;
            else if (lhs instanceof ParsedNumber)
                left = lhs.value;
            else if (lhs instanceof Array)
                left = lhs;
            else if (lhs instanceof Object)
                left = lhs;

            if (asBinding)
            {
                if (left instanceof Binding)
                {
                    left.formatter = formatter.build(left.formatter, settings);
                    return left;
                }
                else
                {
                    var b = new Binding('', left);
                    b.formatter = formatter.build(formatters.identity, settings);
                    return b;
                }
            }
            else
            {
                if (left instanceof Binding)
                {
                    left.formatter = formatter.build(left.formatter, settings);
                    return left.getValue();
                }
                else
                {
                    return formatter.build(formatters.identity, settings)(left);
                }
            }
        }
        // console.log({ lhs: lhs.$$length, item0: item[0].length, settings: settings && settings.$$length })
        result.$$length = lhs.$$length + item[0].length + ((settings && settings.$$length + 1) || 0);
        // console.log(result.$$length);
        return result;
    }

    public static tryParseOperator(expression: string, lhs: ParsedFunction): ParsedFunction
    public static tryParseOperator(expression: string, lhs: ParsedOneOf): ParsedOneOf
    public static tryParseOperator(expression: string, lhs: ParsedOneOf)
    {
        var operator = /^ *([<>=!\+\-\/\*&\|\.#]+) */.exec(expression);
        if (operator)
        {
            switch (operator[1])
            {
                case '#':
                    return Parser.parseFormatter(expression, lhs);
                case '.':
                default:
                    expression = expression.substring(operator[0].length);
                    var rhs = Parser.parseAny(expression, false);
                    var binary = new ParsedBinary(<any>operator[1], lhs, rhs)
                    binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    return ParsedBinary.applyPrecedence(binary);
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
            var item = Parser.parseAny(result, false);
            item = Parser.tryParseOperator(result.substring(item.$$length), item);


            if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
                results.push(item);
            else if (item instanceof ParsedBinary)
                results.push(item.evaluate.bind(item));
            else
                results.push(item);
            results.$$length += item.$$length;
            return item;
        }, ']', results, excludeFirstLevelFunction);
    }

    public static parseString(expression: string, start: string): ParsedOneOf
    {
        var evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        var result = evaluatedRegex[1];
        var parsedString = new ParsedString(result);
        return Parser.tryParseOperator(expression.substring(evaluatedRegex[0].length), parsedString);
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
            case '+':
                return left + right;
            case '-':
                return left - right;
            case '/':
                return left / right;
            case '*':
                return left * right;
            case '||':
                return left || right;
            case '&&':
                return left && right;
            case '.':
                if (right instanceof Function)
                    return right(left);
                return left[right];
            default:
                throw new Error('invalid operator' + operator);
        }
    }

    private static parseCSV<T extends ParsedArray | ParsedObject>(expression: string, parseItem: (expression: string) => ParsedAny, end: string, output: T, excludeFirstLevelFunction: boolean): ParsedFunction | T
    {
        expression = expression.substring(1);
        output.$$length++;
        var isFunction = false;
        do
        {
            var item = parseItem(expression);

            if (item instanceof Function || item instanceof ParsedBinary)
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
                    if ((<any>output[i]) instanceof Function)
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
        var parsedObject: ParsedObject = {};
        Object.defineProperty(parsedObject, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        var result = Parser.parseCSV(expression, function (expression)
        {
            // var length = 0;
            var keyMatch = jsonKeyRegex.exec(expression);

            var key = keyMatch[1] || keyMatch[2] || keyMatch[3];
            //console.log(keyMatch);
            var length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            var item = Parser.parseAny(expression, false);
            length += item.$$length;
            if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
                parsedObject[key] = item.value;
            else if (item instanceof ParsedBinary)
                parsedObject[key] = item.evaluate.bind(item);
            else
                parsedObject[key] = item;
            // expression = expression.substring(result[key].$$length);
            item.$$length = length;
            parsedObject.$$length += length;
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}', parsedObject, excludeFirstLevelFunction);

        return this.tryParseOperator(expression.substring(result.$$length), result)
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

    public static evalAsFunction(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction
    {
        if (!expression && typeof (expression) != 'string')
            return null;
        var parts = Parser.parse(expression, excludeFirstLevelFunction);
        if (parts instanceof Array)
            return Parser.parseFunction(expression) as ParsedFunction;

        return <ParsedFunction>parts;
    }

    public static eval(expression: string, value: any)
    {
        return (Parser.evalAsFunction(expression, false) as ParsedFunction)(value, false);
    }
}