import { isPromiseLike } from './promiseHelpers';
import { Binding, PromiseBinding } from './binder';
import * as formatters from './formatters/index';
import { module } from './helpers';
import { FormatterFactory } from './formatters/common';


const jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^: ]+)) *): */;
// var jsonSingleQuoteKeyRegex = /^ *'([^']+)'|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

export type ParsedOneOf = ParsedObject | ParsedArray | ParsedFunction | ParsedString | ParsedBoolean | ParsedNumber | ParsedBinary;

export enum BinaryOperator
{
    Equal,
    StrictEqual,
    NotEqual,
    StrictNotEqual,
    LessThan,
    LessThanOrEqual,
    GreaterThan,
    GreaterThanOrEqual,
    And,
    Or,
    Minus,
    Plus,
    Modulo,
    Div,
    Times,
    Pow,
    Dot,
    Unknown
}
function parseOperator(op: string): BinaryOperator
{
    switch (op)
    {
        case '==': return BinaryOperator.Equal;
        case '===': return BinaryOperator.StrictEqual;
        case '!=': return BinaryOperator.NotEqual;
        case '!==': return BinaryOperator.StrictNotEqual;
        case '<': return BinaryOperator.LessThan;
        case '<=': return BinaryOperator.LessThanOrEqual;
        case '>': return BinaryOperator.GreaterThan;
        case '>=': return BinaryOperator.GreaterThanOrEqual;
        case '&&': return BinaryOperator.And;
        case '||': return BinaryOperator.Or;
        case '-': return BinaryOperator.Minus;
        case '+': return BinaryOperator.Plus;
        case '%': return BinaryOperator.Modulo;
        case '/': return BinaryOperator.Div;
        case '*': return BinaryOperator.Times;
        case '^': return BinaryOperator.Pow;
        case '.': return BinaryOperator.Dot;
        default: return BinaryOperator.Unknown;
    }
}
function operatorLength(operator: BinaryOperator)
{
    switch (operator)
    {

        case BinaryOperator.Equal:
        case BinaryOperator.NotEqual:
        case BinaryOperator.LessThanOrEqual:
        case BinaryOperator.GreaterThanOrEqual:
        case BinaryOperator.And:
        case BinaryOperator.Or:
            return 2;
        case BinaryOperator.LessThan:
        case BinaryOperator.GreaterThan:
        case BinaryOperator.Minus:
        case BinaryOperator.Plus:
        case BinaryOperator.Div:
        case BinaryOperator.Modulo:
        case BinaryOperator.Times:
        case BinaryOperator.Pow:
            return 1;
        case BinaryOperator.Unknown:
            throw new Error('Unknown operator');
            break;
    }
}

export class ParsedBinary implements ParsedAny
{
    constructor(public operator: BinaryOperator, public left: ParsedOneOf, public right: ParsedOneOf)
    {
        this.$$length = this.left.$$length + operatorLength(this.operator) + this.right.$$length;
    }

    public evaluate(value: unknown, asBinding?: boolean)
    {
        if (asBinding)
        {
            var left, right;
            if (this.left instanceof Function)
                left = this.left(value, asBinding);
            else if (this.left instanceof ParsedBinary)
                left = this.left.evaluate(value, asBinding);
            else if (this.left instanceof ParsedString)
                left = this.left.value;
            else if (this.left instanceof ParsedNumber)
                left = this.left.value;
            else if (this.left instanceof Array)
                left = this.left;
            else if (this.left instanceof Object)
                left = this.left;

            if (this.right instanceof Function)
                right = this.right(value, asBinding);
            else if (this.right instanceof ParsedBinary)
                right = this.right.evaluate(value, asBinding);
            else if (this.right instanceof ParsedString)
                right = this.right.value;
            else if (this.right instanceof ParsedNumber)
                right = this.right.value;
            else if (this.right instanceof Array)
                right = this.right;
            else if (this.right instanceof Object)
                right = this.right

            const binding = new Binding(null, null, false);
            if (left instanceof Binding)
                left.pipe(binding);
            if (right instanceof Binding)
                right.pipe(binding);
            binding['$$length'] = this.$$length;
            binding.getValue = function ()
            {
                let fleft, fright;
                if (left instanceof Binding)
                    fleft = left.getValue();
                else
                    fleft = left;
                if (right instanceof Binding)
                    fright = right.getValue();
                else
                    fright = right;
                return Parser.operate(this.operator, fleft, fright);
            }
            return binding;
        }
        else
        {
            var left, right;
            if (this.left instanceof Function)
                left = this.left(value, false);
            else if (this.left instanceof ParsedBinary)
                left = this.left.evaluate(value, asBinding);
            else if (this.left instanceof ParsedString)
                left = this.left.value;
            else if (this.left instanceof ParsedNumber)
                left = this.left.value;
            else if (this.left instanceof Array)
                left = this.left;
            else if (this.left instanceof Object)
                left = this.left;

            if (this.right instanceof Function)
                right = this.right(value, false);
            else if (this.right instanceof ParsedBinary)
                right = this.right.evaluate(value, asBinding);
            else if (this.right instanceof ParsedString)
                right = this.right.value;
            else if (this.right instanceof ParsedNumber)
                right = this.right.value;
            else if (this.right instanceof Array)
                right = this.right;
            else if (this.right instanceof Object)
                right = this.right;
            return <unknown>Parser.operate(this.operator, left, right);
        }
    }

    public $$length: number;

    public static applyPrecedence(operation: ParsedBinary)
    {
        if (operation.operator != BinaryOperator.Plus && operation.operator != BinaryOperator.Minus)
        {
            if (operation.right instanceof Function && operation.right.$$ast)
            {
                const right = ParsedBinary.applyPrecedence(operation.right.$$ast);
                switch (right.operator)
                {
                    case BinaryOperator.Plus:
                    case BinaryOperator.Minus:
                        break;
                    case BinaryOperator.Times: // b*(c+d) ==> (b*c)+d
                    case BinaryOperator.Div:
                    case BinaryOperator.And:
                    case BinaryOperator.Or:
                    case BinaryOperator.Dot:
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
    [name: string]: unknown;
}

export interface ParsedArray extends ParsedAny, Array<ParsedAny>
{
}

export interface ParsedFunction<T = unknown> extends ParsedAny
{
    $$ast?: ParsedBinary;
    (value: unknown, asBinding?: false): T;
    (value: unknown, asBinding: true): Binding<T>;
    (value: unknown, asBinding?: boolean): T;
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
    public parse(expression: string, excludeFirstLevelFunction: false | undefined): ParsedFunction
    public parse(expression: string, excludeFirstLevelFunction: true): ParsedOneOf
    public parse(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedOneOf
    public parse(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction | ParsedOneOf
    {
        expression = expression.trim();
        const result = this.parseAny(expression, excludeFirstLevelFunction);
        if (!excludeFirstLevelFunction && result instanceof ParsedBinary)
            return result.evaluate.bind(result) as ParsedOneOf;
        return result;
    }

    public parseAny(expression: string, excludeFirstLevelFunction: boolean): ParsedOneOf
    {
        switch (expression[0])
        {
            case '{':
                return this.parseObject(expression, excludeFirstLevelFunction);
            case '[':
                return this.parseArray(expression, excludeFirstLevelFunction);
            case '"':
            case "'":
                return this.parseString(expression, expression[0]);
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
                return this.parseNumber(expression);
            default:
                return this.parseEval(expression);
        }
    }

    public parseNumber(expression): ParsedOneOf
    {
        const result = new ParsedNumber(/^[0-9.]/.exec(expression)[0]);

        return this.tryParseOperator(expression.substring(result.$$length), result);
    }

    public parseBoolean(expression): ParsedBoolean
    {
        let formatter: (o: unknown) => unknown = formatters.identity;
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
            const result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
            if (formatter !== formatters.identity)
                result.value = formatter(result.value) as boolean;
            return result;
        }
        return null;
    }

    public parseEval(expression: string): ParsedBoolean | ParsedFunction | ParsedBinary
    {
        const b = this.parseBoolean(expression);
        if (b)
            return b;

        return this.parseFunction(expression);
    }

    public parseFunction(expression: string): ParsedFunction | ParsedBinary
    {
        let length = 0;
        let formatter: (o: unknown) => unknown = formatters.identity;
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

        const item = /^[\w0-9.$]*/.exec(expression)[0];
        length += item.length;
        const parts = Parser.parseBindable(item);

        let f: ParsedFunction = function (value, asBinding?: boolean)
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
                for (let i = 0; i < parts.length && value; i++)
                {
                    value = value[parts[i]];
                    if (isPromiseLike(value))
                    {
                        var promise: PromiseLike<unknown>;
                        if (i == parts.length - 1)
                            promise = value;
                        else
                            promise = value.then(<ParsedFunction>this.parseFunction(parts.slice(i + 1).join('.'))).then(formatter);
                        promise['$$length'] = item.length;
                        return promise;
                    }
                }
            return value;
        }
        f.$$length = length;
        f = this.tryParseOperator(expression.substr(item.length), f);

        return f;
    }

    public parseFormatter(expression: string, lhs: ParsedOneOf): ParsedOneOf
    {
        const item = /^ *# *([\w0-9.$]+) */.exec(expression);
        expression = expression.substring(item[0].length);
        const formatter: FormatterFactory<unknown, ParsedOneOf> = module('$formatters').resolve('#' + item[1]);
        if (!formatter)
            throw new Error(`filter not found: ${item[1]}`)
        let settings: ParsedObject;
        if (expression[0] == ':')
        {
            settings = formatter.parse(expression.substring(1)) as ParsedObject;
        }

        const result: ParsedFunction = function (value, asBinding?: boolean)
        {
            let left;
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
                    const b = new Binding('', left);
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

    public tryParseOperator(expression: string, lhs: ParsedFunction): ParsedFunction
    public tryParseOperator(expression: string, lhs: ParsedOneOf): ParsedOneOf
    public tryParseOperator(expression: string, lhs: ParsedOneOf)
    {
        const operator = /^ *([<>=!+\-/*&|.#]+) */.exec(expression);
        if (operator)
        {
            switch (operator[1])
            {
                case '#':
                    return this.parseFormatter(expression, lhs);
                case '.':
                default:
                    expression = expression.substring(operator[0].length);
                    var rhs = this.parseAny(expression, false);
                    var binary = new ParsedBinary(parseOperator(operator[1]), lhs, rhs)
                    binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    return ParsedBinary.applyPrecedence(binary);
            }
        }
        else
            return lhs;
    }

    public parseArray(expression: string, excludeFirstLevelFunction?: boolean): ParsedArray | ParsedFunction
    {
        const results: ParsedArray = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        // const isFunction = false;
        return this.parseCSV(expression, (result) =>
        {
            let item = this.parseAny(result, false);
            item = this.tryParseOperator(result.substring(item.$$length), item);


            if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
                results.push(item);
            else if (item instanceof ParsedBinary)
                results.push(item.evaluate.bind(item) as unknown);
            else
                results.push(item);
            results.$$length += item.$$length;
            return item;
        }, ']', results, excludeFirstLevelFunction);
    }

    public parseString(expression: string, start: string): ParsedOneOf
    {
        const evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        const result = evaluatedRegex[1];
        const parsedString = new ParsedString(result);
        return this.tryParseOperator(expression.substring(evaluatedRegex[0].length), parsedString);
    }

    public static operate(operator: BinaryOperator, left?: unknown, right?: unknown)
    {
        // if (arguments.length == 1)
        //     return function (left: unknown, right: unknown)
        //     {
        //         return this.operate(operator, left, right);
        //     }
        switch (operator)
        {
            case BinaryOperator.Equal:
                return left == right;
            case BinaryOperator.StrictEqual:
                return left === right;
            case BinaryOperator.LessThan:
                return left < right;
            case BinaryOperator.LessThanOrEqual:
                return left <= right;
            case BinaryOperator.GreaterThan:
                return left > right;
            case BinaryOperator.GreaterThanOrEqual:
                return left >= right;
            case BinaryOperator.NotEqual:
                return left != right;
            case BinaryOperator.StrictNotEqual:
                return left !== right;
            case BinaryOperator.Plus:
                return (left as number) + (right as number);
            case BinaryOperator.Minus:
                return (left as number) - (right as number);
            case BinaryOperator.Div:
                return (left as number) / (right as number);
            case BinaryOperator.Times:
                return (left as number) * (right as number);
            case BinaryOperator.Or:
                return left || right;
            case BinaryOperator.And:
                return left && right;
            case BinaryOperator.Dot:
                if (right instanceof Function)
                    return right(left);
                return left[right as keyof typeof left];
            default:
                throw new Error('invalid operator' + operator);
        }
    }

    public parseCSV<T extends ParsedArray | ParsedObject>(expression: string, parseItem: (expression: string) => ParsedAny, end: string, output: T, excludeFirstLevelFunction: boolean): ParsedFunction | T
    {
        expression = expression.substring(1);
        output.$$length++;
        let isFunction = false;
        do
        {
            const item = parseItem(expression);

            if (item instanceof Function || item instanceof ParsedBinary)
                isFunction = true;

            expression = expression.substring(item.$$length);
            const next = /^ *, */.exec(expression);
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
        let result: unknown;
        if (output instanceof Array)
            result = [];
        else
            result = {};
        if (isFunction && !excludeFirstLevelFunction)
        {
            const f: ParsedFunction = function (value, asBinding: boolean)
            {
                for (const i in output)
                {
                    if (output[i] instanceof Function)
                        result[i] = (output[i] as unknown as ParsedFunction)(value, asBinding);
                    else
                        result[i] = output[i];
                }
                return result;
            } as unknown as ParsedFunction;
            f.$$length = output.$$length;
            return f;
        }
        else
            return output;
    }

    public parseObject(expression: string, excludeFirstLevelFunction?: boolean)
    {
        const parsedObject: ParsedObject = {};
        Object.defineProperty(parsedObject, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        const result = this.parseCSV(expression, (expression) =>
        {
            // var length = 0;
            const keyMatch = jsonKeyRegex.exec(expression);

            const key = keyMatch[1] || keyMatch[2] || keyMatch[3];
            //console.log(keyMatch);
            let length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            const item = this.parseAny(expression, false);
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

    public static getSetter(expression: string, root: unknown)
    {
        let target = root;
        const parts = Parser.parseBindable(expression);

        while (parts.length > 1 && typeof (target) != 'undefined')
        {
            target = this.eval(parts[0], target);
            parts.shift();
        }
        if (typeof (target) == 'undefined')
            return null;

        return { expression: parts[0], target: target, set: function (value) { target[parts[0]] = value } };
    }

    public static evalAsFunction(expression: string, excludeFirstLevelFunction?: true): ParsedOneOf
    public static evalAsFunction<T>(expression: string, excludeFirstLevelFunction?: false): ParsedFunction<T>
    public static evalAsFunction<T>(expression: string, excludeFirstLevelFunction?: boolean): ParsedFunction<T>
    {
        const parser = new Parser();
        if (!expression && typeof (expression) != 'string')
            return null;
        const parts = parser.parse(expression, excludeFirstLevelFunction);
        if (Array.isArray(parts))
            return parser.parseFunction(expression) as ParsedFunction<T>;
        if (typeof parts != 'function')
            throw new Error(`${expression} could not be parsed as a function`);
        return parts as ParsedFunction<T>;
    }

    public static eval(expression: string, value: unknown)
    {
        return (this.evalAsFunction(expression, false) as ParsedFunction)(value, false);
    }
}