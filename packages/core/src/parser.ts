import { Deferred, isPromiseLike, PromiseStatus } from './promiseHelpers';
import { Binding, PromiseBinding } from './binder';
import * as formatters from './formatters';


var jsonKeyRegex = /^ *"([^"]+)"|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
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

    public static parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedAny
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
            default:
                return Parser.parseEval(expression);
        }
    }

    public static parseEval(expression: string): ParsedFunction
    {
        var formatter = formatters.identity;
        if (expression[0] == '!')
        {
            formatter = formatters.negate;
            expression = expression.substring(1);
        }

        expression = /^[\w0-9\.]+/.exec(expression)[0];
        var parts = Parser.parseBindable(expression);

        var f: ParsedFunction = function (value, asBinding?: boolean)
        {
            if (asBinding)
            {
                if (isPromiseLike(value))
                {
                    var binding = new PromiseBinding(expression, value);
                    binding['$$length'] = expression.length;
                    binding.formatter = formatter;
                    return binding;
                }
                var binding = new Binding(expression, value);
                binding['$$length'] = expression.length;
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
                            promise = value.then(Parser.parseEval(parts.slice(i + 1).join('.'))).then(formatter);
                        promise['$$length'] = expression.length;
                        return promise;
                    }
                }
            }
            return value;
        }
        f.$$length = expression.length;
        return f;
    }

    public static parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction
    {
        var results: ParsedArray = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        var isFunction = false;
        return Parser.parseCSV(expression, function (result)
        {
            var item: ParsedAny = Parser.parseAny(result, false);

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

    private static parseCSV<T extends ParsedAny>(expression: string, onItem: (expression: string) => ParsedAny, end: string, output: T, excludeFirstLevelFunction: boolean): ParsedFunction | T
    {
        expression = expression.substring(1);
        output.$$length++;
        var isFunction = false;
        do
        {
            var item = onItem(expression);
            output.$$length += item.$$length;
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
            return Parser.parseEval(expression);

        return <ParsedFunction>parts;
    }

    public static eval(expression: string, value: any)
    {
        return Parser.evalAsFunction(expression, false)(value, false);
    }
}