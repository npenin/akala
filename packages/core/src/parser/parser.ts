import { BinaryOperator, BinaryExpression, CallExpression, ConstantExpression, Expression, Expressions, ExpressionType, MemberExpression, NewExpression, ParameterExpression, StrictExpressions, TypedExpression, UnaryExpression, UnaryOperator } from './expressions/index.js';

import identity from '../formatters/identity.js';
import negate from '../formatters/negate.js';
import booleanize from '../formatters/booleanize.js';
import { TernaryOperator } from './expressions/ternary-operator.js';
import { TernaryExpression } from './expressions/ternary-expression.js';
import type { ExpressionVisitor } from './expressions/visitors/expression-visitor.js';
import { Formatter, FormatterFactory } from '../formatters/common.js';
import { formatters } from '../formatters/index.js';
import { escapeRegExp } from '../reflect.js';


const jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^: ]+)) *): */;
// var jsonSingleQuoteKeyRegex = /^ *'([^']+)'|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

/** @deprecated */
export type ParsedOneOf = ParsedObject | ParsedArray | ParsedString | ParsedBoolean | ParsedNumber | ParsedBinary;

export type ExpressionsWithLength = (TypedExpression<unknown> | Expressions) & ParsedAny;

/**
 * @deprecated Please use ObservableObject.setValue instead which more versatile
 * Gets the setter function for a given expression and root object.
 * @param {string} expression - The expression to evaluate.
 * @param {T} root - The root object.
 * @returns {{ expression: string, target: T, set: (value: unknown) => void } | null} The setter function or null if not found.
 */
export function getSetter<T = unknown>(expression: string, root: T): { expression: string, target: T, set: (value: unknown) => void } | null
{
    let target = root;
    const parts = expression.split('.');

    while (parts.length > 1 && typeof (target) != 'undefined')
    {
        target = this.eval(parts[0], target);
        parts.shift();
    }
    if (typeof (target) == 'undefined')
        return null;

    return { expression: parts[0], target: target, set: function (value) { target[parts[0]] = value } };
}

/**
 * Parses a binary operator from a string.
 * @param {string} op - The operator string.
 * @returns {BinaryOperator} The parsed binary operator.
 */
function parseBinaryOperator(op: string): BinaryOperator
{
    if (op in BinaryOperator)
        return op as BinaryOperator;
    return BinaryOperator.Unknown;
}

/**
 * Parses a ternary operator from a string.
 * @param {string} op - The operator string.
 * @returns {TernaryOperator} The parsed ternary operator.
 */
function parseTernaryOperator(op: string): TernaryOperator
{
    switch (op)
    {
        case '?': return TernaryOperator.Question;
        default: return TernaryOperator.Unknown;
    }
}

/**
 * Gets the length of an operator.
 * @param {BinaryOperator | TernaryOperator} operator - The operator.
 * @returns {number} The length of the operator.
 */
function operatorLength(operator: BinaryOperator | TernaryOperator)
{
    switch (operator)
    {

        case BinaryOperator.Equal:
        case BinaryOperator.NotEqual:
        case BinaryOperator.LessThanOrEqual:
        case BinaryOperator.GreaterThanOrEqual:
        case BinaryOperator.And:
        case BinaryOperator.Or:
        case BinaryOperator.QuestionDot:
        case TernaryOperator.Question:
            return 2;
        case BinaryOperator.LessThan:
        case BinaryOperator.GreaterThan:
        case BinaryOperator.Minus:
        case BinaryOperator.Plus:
        case BinaryOperator.Div:
        case BinaryOperator.Modulo:
        case BinaryOperator.Times:
        case BinaryOperator.Pow:
        case BinaryOperator.Dot:
        case BinaryOperator.Format:
            return 1;
        case BinaryOperator.StrictEqual:
        case BinaryOperator.StrictNotEqual:
            return 3;
        case BinaryOperator.Unknown:
        case TernaryOperator.Unknown:
            throw new Error('Unknown operator ' + operator);

        default:
            let x: never = operator;
            throw new Error('Unhandled operator ' + x);
    }
}

/**
 * Represents a format expression.
 * @extends Expression
 */
export class FormatExpression<TOutput> extends Expression implements ParsedAny
{
    constructor(public readonly lhs: ExpressionsWithLength | (TypedExpression<unknown> & ParsedAny), public readonly formatter: new (...args: unknown[]) => Formatter<TOutput>, public readonly settings: Expressions)
    {
        super();
    }

    get type(): ExpressionType.Format
    {
        return ExpressionType.Format;
    }

    accept(visitor: ExpressionVisitor): TypedExpression<TOutput>
    {
        return visitor.visitFormat(this);
    }

    public $$length: number;

}

/**
 * Represents a parsed binary expression.
 * @extends BinaryExpression
 */
export class ParsedBinary extends BinaryExpression<ExpressionsWithLength> implements ParsedAny
{
    constructor(operator: BinaryOperator, left: ExpressionsWithLength, public right: ExpressionsWithLength)
    {
        super(left, operator, right);
        this.$$length = this.left.$$length + operatorLength(this.operator) + this.right.$$length;
    }

    public $$length: number;

    /**
     * Applies precedence to a parsed binary expression.
     * @param {ParsedBinary} operation - The parsed binary expression.
     * @returns {ParsedBinary} The parsed binary expression with applied precedence.
     */
    public static applyPrecedence(operation: ParsedBinary)
    {
        if (operation.operator != BinaryOperator.Plus && operation.operator != BinaryOperator.Minus)
        {
            if (operation.right instanceof ParsedBinary)
            {
                const right = ParsedBinary.applyPrecedence(operation.right);
                switch (right.operator)
                {
                    case BinaryOperator.Plus:
                    case BinaryOperator.Minus:
                        break;
                    case BinaryOperator.Times: // b*c+d ==> (b*c)+d
                    case BinaryOperator.Div:
                    case BinaryOperator.And:
                    case BinaryOperator.Or:
                        var left = operation.left;
                        return new ParsedBinary(right.operator, new ParsedBinary(operation.operator, left, right.left), right.right);
                    case BinaryOperator.QuestionDot:
                    case BinaryOperator.Dot:
                        var left = operation.left;
                        return new MemberExpression(new MemberExpression(left as TypedExpression<unknown>, right.left, operation.operator == BinaryOperator.QuestionDot), right.right, right.operator == BinaryOperator.QuestionDot);
                }
            }
            if (operation.right instanceof ParsedTernary)
            {
                return new ParsedTernary(operation.right.operator, new ParsedBinary(operation.operator, operation.left, operation.right.first), operation.right.second, operation.right.third)
            }
        }
        return operation;
    }

    public toString()
    {
        return '(' + this.left.toString() + this.operator + this.right.toString() + ')';
    }
}

/**
 * Represents a parsed ternary expression.
 * @extends TernaryExpression
 */
export class ParsedTernary extends TernaryExpression<ExpressionsWithLength> implements ParsedAny
{
    constructor(operator: TernaryOperator, first: ExpressionsWithLength, public second: ExpressionsWithLength, public third: ExpressionsWithLength)
    {
        super(first, operator, second, third);
        this.$$length = this.first.$$length + operatorLength(this.operator) + this.second.$$length + this.third.$$length;
    }

    public $$length: number;

    public toString()
    {
        return '(' + this.first.toString() + this.operator[0] + this.second.toString() + this.operator[1] + this.third.toString() + ')';
    }
}

/**
 * Represents a parsed object.
 * @extends NewExpression
 */
export class ParsedObject<T extends object = object> extends NewExpression<T> implements ParsedAny
{

    constructor(public $$length: number, ...init: MemberExpression<T, keyof T, T[keyof T]>[])
    {
        super(...init);
    }
}

/**
 * Represents a parsed array.
 * @extends NewExpression
 */
export class ParsedArray extends NewExpression<unknown[]> implements ParsedAny
{

    constructor(public $$length: number, ...init: MemberExpression<unknown[], number, unknown>[])
    {
        super(...init);
        this.newType = '['
    }
}

/**
 * Represents a parsed string.
 * @extends ConstantExpression
 */
export class ParsedString extends ConstantExpression<string> implements ParsedAny
{
    constructor(value: string)
    {
        super(value);
        this.$$length = value.length + 2;
    }

    public $$length: number;

    public toString()
    {
        return this.value;
    }
}

/**
 * Represents a parsed number.
 * @extends ConstantExpression
 */
export class ParsedNumber extends ConstantExpression<number> implements ParsedAny
{
    constructor(value: string)
    {
        super(Number(value));
        this.$$length = value.length;
    }

    public $$length: number;
}

/**
 * Represents a parsed boolean.
 * @extends ConstantExpression
 */
export class ParsedBoolean extends ConstantExpression<boolean> implements ParsedAny
{
    constructor(value: string | boolean)
    {
        super(Boolean(value));
        if (typeof value != 'undefined')
            this.$$length = value.toString().length;
    }

    public $$length: number;
}

/**
 * Represents a parsed call expression.
 * @extends CallExpression
 */
export class ParsedCall extends CallExpression<any, any> implements ParsedAny
{
    constructor(argsLength: number, source: TypedExpression<any> & ParsedAny, method: TypedExpression<any> & ParsedAny, args: (StrictExpressions & ParsedAny)[])
    {
        super(source, method, args as StrictExpressions[]);
        this.$$length = source.$$length + argsLength;
        if (method)
            this.$$length += method.$$length;
    }

    public $$length: number;
}

/**
 * Represents a parser.
 */
export class Parser
{
    public static parameterLess: Parser = new Parser();

    private parameters: Record<string, ParameterExpression<unknown>>;

    constructor(...parameters: ParameterExpression<unknown>[])
    {
        if (parameters)
        {
            this.parameters = {}
            parameters.forEach(param =>
            {
                this.parameters[param.name] = param
            });
        }
    }

    /**
     * Parses an expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} [parseFormatter=true] - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed expression.
     */
    public parse(expression: string, parseFormatter?: boolean, reset?: () => void): ExpressionsWithLength
    {
        expression = expression.trim();
        return this.parseAny(expression, (typeof parseFormatter !== 'boolean') || parseFormatter, reset);
    }

    /**
     * Parses any expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed expression.
     */
    public parseAny(expression: string, parseFormatter: boolean, reset?: () => void): ExpressionsWithLength
    {
        switch (expression[0])
        {
            case '{':
                return this.parseObject(expression, parseFormatter);
            case '[':
                return this.parseArray(expression, parseFormatter);
            case '"':
            case "'":
                return this.parseString(expression, expression[0], parseFormatter);
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
                return this.parseNumber(expression, parseFormatter);
            default:
                return this.parseEval(expression, parseFormatter, reset);
        }
    }

    /**
     * Parses a number expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @returns {ExpressionsWithLength} The parsed number expression.
     */
    public parseNumber(expression: string, parseFormatter: boolean)
    {
        const result = new ParsedNumber(/^[0-9.]+/.exec(expression)[0]);

        return this.tryParseOperator(expression.substring(result.$$length), result, parseFormatter);
    }

    /**
     * Parses a boolean expression.
     * @param {string} expression - The expression to parse.
     * @returns {ParsedBoolean} The parsed boolean expression.
     */
    public parseBoolean(expression): ParsedBoolean
    {
        let formatter: Formatter<unknown> = identity.instance;
        if (expression[0] == '!')
        {
            formatter = negate.instance;
            expression = expression.substring(1);
        }
        if (expression[0] == '!')
        {
            formatter = booleanize.instance;
            expression = expression.substring(1);
        }

        if (/^true|false|undefined/.exec(expression))
        {
            const result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
            if (formatter !== identity.instance)
            {
                const newResult = new ParsedBoolean(formatter.format(result.value) as boolean);
                newResult.$$length = result.$$length;
                return newResult;
            }
            return result;
        }
        return null;
    }

    /**
     * Parses an evaluation expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed evaluation expression.
     */
    public parseEval(expression: string, parseFormatter: boolean, reset?: () => void)
    {
        const b = this.parseBoolean(expression);
        if (b)
            return b;

        return this.parseFunction(expression, parseFormatter, reset);
    }

    /**
     * Parses a function expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ParsedBinary} The parsed function expression.
     */
    public parseFunction(expression: string, parseFormatter: boolean, reset?: () => void): ParsedBinary
    {
        let length = 0;
        let operator: UnaryOperator;
        while (expression[0] == '!')
        {
            if (expression[0] == '!')
            {
                operator = UnaryOperator.Not;
                expression = expression.substring(1);
                length++;
            }
            if (expression[0] == '!')
            {
                operator = UnaryOperator.NotNot;
                expression = expression.substring(1);
                length++;
            }
        }

        let item = /^[\w0-9\$_]*\??/.exec(expression)[0];
        const itemLength = item.length;
        length += itemLength;

        const optional = item.endsWith('?')
        if (optional)
            item = item.substring(0, itemLength - 1);

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: ExpressionsWithLength;
        if (this.parameters)
        {
            if (this.parameters[''] && '$$length' in this.parameters[''])
                length += this.parameters[''].$$length as number;
            result = new MemberExpression(this.parameters[''] as TypedExpression<any>, new ParsedString(item), optional) as TypedExpression<any>
        }
        else
            result = new MemberExpression(null as any, new ParsedString(item), optional) as TypedExpression<any>

        result.$$length = length;
        if (typeof operator != 'undefined')
        {
            result = new UnaryExpression(result, operator);
            result.$$length = length;
        }
        return this.tryParseOperator(expression.substring(itemLength), result, parseFormatter, reset);
    }

    /**
     * Parses a formatter expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {() => void} reset - The reset function.
     * @returns {ExpressionsWithLength} The parsed formatter expression.
     */
    public parseFormatter(expression: string, lhs: ExpressionsWithLength, reset: () => void): ExpressionsWithLength
    {
        const item = /^ *# *([\w\.\$]+) */.exec(expression);
        expression = expression.substring(item[0].length);
        // const formatter: FormatterFactory<unknown, ParsedOneOf> = module('$formatters').resolve('#' + item[1]);
        // if (!formatter)
        //     throw new Error(`filter not found: ${item[1]}`)
        reset?.();
        let settings: ExpressionsWithLength;
        if (expression[0] == ':')
        {
            settings = this.parseAny(expression.substring(1), false);
            expression = expression.substring(settings.$$length + 1);

            // settings = formatter.parse(expression.substring(1)) as ParsedObject;
        }

        const result = new FormatExpression(lhs, formatters.resolve<FormatterFactory<unknown>>('#' + item[1]), settings);
        result.$$length = lhs.$$length + item[0].length + ((settings && settings.$$length + 1) || 0);
        return this.tryParseOperator(expression, result, true, reset);
    }

    /**
     * Tries to parse an operator expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed operator expression.
     */
    public tryParseOperator(expression: string, lhs: ExpressionsWithLength, parseFormatter: boolean, reset?: () => void)
    {
        const operator = /^ *([<>=!+\-/*&|\?\.#\[\(]+) */.exec(expression);
        if (operator)
        {
            let rhs: ExpressionsWithLength;
            const oldParameters = this.parameters;

            switch (operator[1])
            {
                case '#':
                    if (!parseFormatter)
                        return lhs;

                    return this.parseFormatter(expression, lhs, reset);
                case '(':
                    reset?.();
                    return this.parseFunctionCall(expression.substring(operator[0].length - 1), lhs, parseFormatter)
                case '[':
                    expression = expression.substring(operator[0].length);
                    rhs = this.parseAny(expression, parseFormatter, reset);
                    const member = new MemberExpression(lhs as TypedExpression<any>, rhs as TypedExpression<any>, false);
                    member.$$length = lhs.$$length + operator[0].length + rhs.$$length + operator[0].length;
                    return this.tryParseOperator(expression.substring(rhs.$$length + operator[0].length), member, parseFormatter, reset);

                case '?.':
                case '.':
                    expression = expression.substring(operator[0].length);

                    this.parameters = Object.assign({}, this.parameters, { '': lhs });
                    const selfReset = (() => { this.parameters = oldParameters });
                    rhs = this.parseAny(expression, parseFormatter, reset || selfReset);
                    rhs.$$length += operator[0].length;
                    selfReset();
                    // if (rhs.type == ExpressionType.MemberExpression)
                    // {
                    //     let me: MemberExpression<any, any, any> = rhs;
                    //     const reverseStack = [me]

                    //     while (me.source?.type == ExpressionType.MemberExpression)
                    //     {
                    //         me = me.source;
                    //         reverseStack.unshift(me);
                    //     }
                    //     // lhs = new MemberExpression(lhs as TypedExpression<any>, me.member as TypedExpression<any>, parseOperator(operator[1]) == BinaryOperator.QuestionDot)
                    //     let lhsLength = lhs.$$length + operator[0].length + rhs.$$length;
                    //     for (let i = 0; reverseStack.length; i++)
                    //     {
                    //         me = reverseStack.shift();

                    //         lhs = new MemberExpression(lhs as TypedExpression<any>, me.member, i == 0 && operator[1] == '?.' || i > 0 && me.optional);
                    //     }
                    //     lhs.$$length = lhsLength;
                    //     return lhs;
                    // }
                    // var binary = new ParsedBinary(parseBinaryOperator(operator[1]), lhs, rhs);
                    // binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    // return ParsedBinary.applyPrecedence(binary);
                    return rhs;
                case '?':
                    expression = expression.substring(operator[0].length);
                    const tOperator = parseTernaryOperator(operator[1])
                    const second = this.parseAny(expression, parseFormatter, reset);
                    expression = expression.substring(second.$$length);
                    const operator2 = /^ *(:)/.exec(expression);
                    if (!operator2)
                        throw new Error('Invalid ternary operator');
                    const third = this.parseAny(expression.substring(operator2[0].length), parseFormatter, reset);
                    var ternary = new ParsedTernary(tOperator, lhs, second, third)
                    ternary.$$length = lhs.$$length + operator[0].length + second.$$length + operator2[0].length + third.$$length;
                    return ternary;
                default:
                    reset?.();
                    expression = expression.substring(operator[0].length);
                    rhs = this.parseAny(expression, parseFormatter);
                    var binary = new ParsedBinary(parseBinaryOperator(operator[1]), lhs, rhs)
                    binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    return ParsedBinary.applyPrecedence(binary);
            }
        }
        else
            return lhs;
    }

    /**
     * Parses a function call expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @returns {ExpressionsWithLength} The parsed function call expression.
     */
    parseFunctionCall(expression: string, lhs: ExpressionsWithLength, parseFormatter: boolean)
    {
        const results: (StrictExpressions & ParsedAny)[] = [];
        const length = this.parseCSV(expression, (result) =>
        {
            let item = this.parseAny(result, parseFormatter);
            // item = this.tryParseOperator(result.substring(item.$$length), item, parseFormatter);
            results.push(item as StrictExpressions & ParsedAny);
            return item;
        }, ')');

        if (lhs?.type == ExpressionType.MemberExpression)
            return this.tryParseOperator(expression.substring(length), new ParsedCall(length, lhs.source as ExpressionsWithLength & TypedExpression<any>, lhs.member, results), parseFormatter);
        return this.tryParseOperator(expression.substring(length), new ParsedCall(length, lhs as ExpressionsWithLength & TypedExpression<any>, null, results), parseFormatter);
    }

    /**
     * Parses an array expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed array expression.
     */
    public parseArray(expression: string, parseFormatter: boolean, reset?: () => void)
    {
        const results: ExpressionsWithLength[] & ParsedAny = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        // const isFunction = false;
        const length = this.parseCSV(expression, (result) =>
        {
            let item = this.parseAny(result, parseFormatter);
            // item = this.tryParseOperator(result.substring(item.$$length), item, parseFormatter);
            results.push(item);
            return item;
        }, ']');

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.tryParseOperator(expression.substring(length), new ParsedArray(length, ...results.map((v, i) => new MemberExpression<any, number, any>(v as TypedExpression<any>, new ParsedNumber(i.toString()), false))), true);
    }

    /**
     * Parses a string expression.
     * @param {string} expression - The expression to parse.
     * @param {string} start - The starting character of the string.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @returns {ExpressionsWithLength} The parsed string expression.
     */
    public parseString(expression: string, start: '"' | "'", parseFormatter: boolean)
    {
        start = escapeRegExp(start) as '"' | "'";
        const evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)*)" + start).exec(expression);
        // console.log(arguments);
        const result = evaluatedRegex[1];
        const parsedString = new ParsedString(result);
        return this.tryParseOperator(expression.substring(evaluatedRegex[0].length), parsedString, parseFormatter);
    }

    /**
     * Operates on two values using a binary operator.
     * @param {BinaryOperator} operator - The binary operator.
     * @param {unknown} [left] - The left-hand side value.
     * @param {unknown} [right] - The right-hand side value.
     * @returns {unknown} The result of the operation.
     */
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

    /**
     * Parses a CSV expression.
     * @param {string} expression - The expression to parse.
     * @param {(expression: string) => ExpressionsWithLength} parseItem - The function to parse each item.
     * @param {string} end - The ending character of the CSV.
     * @returns {number} The length of the parsed CSV expression.
     */
    public parseCSV(expression: string, parseItem: (expression: string) => ExpressionsWithLength, end: string): number
    {
        expression = expression.substring(1);
        let length = 1;
        // let isFunction = false;
        do
        {
            const item = parseItem(expression);

            length += item.$$length;
            // if (item instanceof Function || item instanceof ParsedBinary)
            //     isFunction = true;

            expression = expression.substring(item.$$length);
            const next = /^ *, */.exec(expression);
            // console.log(expression)
            if (!next)
                break;
            expression = expression.substring(next[0].length);
            // console.log(expression);
            length += next[0].length;
        }
        while (expression[0] != end);
        length += end.length;
        // console.log(output.$$length);
        return length;
    }

    /**
     * Parses an object expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @returns {ExpressionsWithLength} The parsed object expression.
     */
    public parseObject(expression: string, parseFormatter: boolean)
    {
        const parsedObject: { key: string, value: ExpressionsWithLength }[] & ParsedAny = [];
        parsedObject.$$length = 0;
        Object.defineProperty(parsedObject, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        const result = this.parseCSV(expression, (expression) =>
        {
            // var length = 0;
            const keyMatch = jsonKeyRegex.exec(expression);

            const key = keyMatch[1] || keyMatch[2] || keyMatch[3];
            //console.log(keyMatch);
            let length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            const item = this.parseAny(expression, parseFormatter);
            length += item.$$length;
            // if (item instanceof ParsedBoolean || item instanceof ParsedString || item instanceof ParsedNumber)
            //     parsedObject[key] = item.value;
            // else if (item instanceof ParsedBinary)
            //     parsedObject[key] = item.evaluate.bind(item);
            // else
            parsedObject.push({ key, value: item });
            // expression = expression.substring(result[key].$$length);
            item.$$length = length;
            parsedObject.$$length += length;
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}');

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.tryParseOperator(expression.substring(result), new ParsedObject(result, ...parsedObject.map(v => new MemberExpression<any, string, any>(v.value as TypedExpression<any>, new ParsedString(v.key), false))), parseFormatter)
    }
}
