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

const jsonKeyRegex = /\s*(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([a-zA-Z0-9_$]+)) *):\s*/;


export interface Cursor
{
    offset: number;
    freeze(): Cursor;
}


export class StringCursor implements Cursor
{
    get length(): number { return this.string.length };
    get char(): string { return this.string[this._offset]; };
    constructor(public readonly string: string) { }

    private _offset: number = 0;
    get offset(): number { return this._offset; };
    set offset(value: number)
    {
        this._offset = value;
        if (this._offset > this.string.length)
            throw new Error('Cursor cannot go beyond the string limit');
    };

    public freeze()
    {
        const c = new StringCursor(this.string);
        c._offset = this._offset;
        return c;
    }

    public exec(regex: RegExp)
    {
        if (!regex.global)
            regex = new RegExp(regex, 'g' + regex.flags);
        regex.lastIndex = this._offset;
        const result = regex.exec(this.string);
        if (result)
        {
            if (result.index != this._offset)
                return null;
            this.offset += result[0].length;
        }
        return result;
    }
}

/** @deprecated */
export type ParsedOneOf = ParsedObject | ParsedArray | ParsedString | ParsedBoolean | ParsedNumber | ParsedBinary;

export type ExpressionsWithLength = (TypedExpression<unknown> | Expressions);

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
 * Represents a format expression.
 * @extends Expression
 */
export class FormatExpression<TOutput> extends Expression 
{
    constructor(public readonly lhs: ExpressionsWithLength | (TypedExpression<unknown>), public readonly formatter: new (...args: unknown[]) => Formatter<TOutput>, public readonly settings: Expressions)
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

}

/**
 * Represents a parsed binary expression.
 * @extends BinaryExpression
 */
export class ParsedBinary extends BinaryExpression<ExpressionsWithLength> 
{
    constructor(operator: BinaryOperator, left: ExpressionsWithLength, public right: ExpressionsWithLength)
    {
        super(left, operator, right);
    }

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
                        return new ParsedBinary(right.operator, new ParsedBinary(operation.operator, operation.left, right.left), right.right);
                    case BinaryOperator.QuestionDot:
                    case BinaryOperator.Dot:
                        return new MemberExpression(new MemberExpression(operation.left as TypedExpression<unknown>, right.left, operation.operator == BinaryOperator.QuestionDot), right.right, right.operator == BinaryOperator.QuestionDot);
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
        return `( ${this.left} ${this.operator} ${this.right} )`;
    }
}

/**
 * Represents a parsed ternary expression.
 * @extends TernaryExpression
 */
export class ParsedTernary extends TernaryExpression<ExpressionsWithLength> 
{
    constructor(operator: TernaryOperator, first: ExpressionsWithLength, public second: ExpressionsWithLength, public third: ExpressionsWithLength)
    {
        super(first, operator, second, third);
    }

    public toString()
    {
        return `( ${this.first} ${this.operator[0]} ${this.second} ${this.operator[1]} ${this.third} )`;
    }
}

/**
 * Represents a parsed object.
 * @extends NewExpression
 */
export class ParsedObject<T extends object = object> extends NewExpression<T> 
{

    constructor(...init: MemberExpression<T, keyof T, T[keyof T]>[])
    {
        super(...init);
    }
}

/**
 * Represents a parsed array.
 * @extends NewExpression
 */
export class ParsedArray extends NewExpression<unknown[]> 
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
export class ParsedString extends ConstantExpression<string> 
{
    constructor(value: string)
    {
        super(value);
    }

    public toString()
    {
        return this.value;
    }
}

/**
 * Represents a parsed number.
 * @extends ConstantExpression
 */
export class ParsedNumber extends ConstantExpression<number> 
{
    constructor(value: string)
    {
        super(Number(value));
    }
}

/**
 * Represents a parsed boolean.
 * @extends ConstantExpression
 */
export class ParsedBoolean extends ConstantExpression<boolean> 
{
    constructor(value: string | boolean)
    {
        super(Boolean(value));
    }
}

/**
 * Represents a parsed call expression.
 * @extends CallExpression
 */
export class ParsedCall extends CallExpression<any, any> 
{
    constructor(source: TypedExpression<any>, method: TypedExpression<any>, args: (StrictExpressions)[])
    {
        super(source, method, args);
    }

}

/**
 * Represents a parser.
 */
export class Parser
{
    public static readonly parameterLess: Parser = new Parser();

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
        return this.parseAny(new StringCursor(expression), (typeof parseFormatter !== 'boolean') || parseFormatter, reset);
    }

    /**
     * Parses any expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed expression.
     */
    public parseAny(expression: StringCursor, parseFormatter: boolean, reset?: () => void): ExpressionsWithLength
    {
        switch (expression.char)
        {
            case '{':
                return this.parseObject(expression, parseFormatter);
            case '[':
                return this.parseArray(expression, parseFormatter, reset);
            case '"':
            case "'":
                return this.parseString(expression, expression.char, parseFormatter);
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
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed number expression.
     */
    public parseNumber(expression: StringCursor, parseFormatter: boolean)
    {
        const match = expression.exec(/\d+(?:\.\d+)?/);
        if (!match)
            throw new Error('Invalid number at position ' + expression.offset);
        const result = new ParsedNumber(match[0]);

        return this.tryParseOperator(expression, result, parseFormatter);
    }

    /**
     * Parses a boolean expression.
     * @param {string} expression - The expression to parse.
     * @returns {ParsedBoolean} The parsed boolean expression.
     */
    public parseBoolean(expression: StringCursor): ParsedBoolean
    {
        let formatter: Formatter<unknown> = identity.instance;
        if (expression.char == '!')
        {
            formatter = negate.instance;
            expression.offset++;
        }
        if (expression.char == '!')
        {
            formatter = booleanize.instance;
            expression.offset++;
        }

        const boolMatch = expression.exec(/(?:true|false|undefined|null)/);
        if (boolMatch)
        {
            const result = new ParsedBoolean(boolMatch[0]);
            if (formatter !== identity.instance)
            {
                return new ParsedBoolean(formatter.format(result.value) as boolean);
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
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed evaluation expression.
     */
    public parseEval(expression: StringCursor, parseFormatter: boolean, reset?: () => void)
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
     * @returns {ExpressionsWithLength} The parsed function expression.
     */
    public parseFunction(expression: StringCursor, parseFormatter: boolean, reset?: () => void): ParsedBinary
    {
        let operator: UnaryOperator;
        while (expression.char === '!')
        {
            if (expression.char === '!')
            {
                operator = UnaryOperator.Not;

                expression.offset++;
            }
            if (expression[0] === '!')
            {
                operator = UnaryOperator.NotNot;
                expression.offset++;
            }
        }

        let item = expression.exec(/[\w$]*\??/)[0];

        const optional = item.endsWith('?')
        if (optional)
            item = item.substring(0, item.length - 1);

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: ExpressionsWithLength;
        if (this.parameters)
            result = new MemberExpression(this.parameters[''] as TypedExpression<any>, new ParsedString(item), optional) as TypedExpression<any>
        else
            result = new MemberExpression(null as any, new ParsedString(item), optional) as TypedExpression<any>

        if (typeof operator != 'undefined')
        {
            result = new UnaryExpression(result, operator);
        }
        return this.tryParseOperator(expression, result, parseFormatter, reset);
    }

    /**
     * Parses a formatter expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {() => void} reset - The reset function.
     * @returns {ExpressionsWithLength} The parsed formatter expression.
     */
    public parseFormatter(expression: StringCursor, lhs: ExpressionsWithLength, reset: () => void): ExpressionsWithLength
    {
        const item = expression.exec(/\s*([\w\.\$]+)\s*/);
        reset?.();
        let settings: ExpressionsWithLength;
        if (expression.char === ':')
        {
            expression.offset++;
            settings = this.parseAny(expression, false);
        }

        const result = new FormatExpression(lhs, formatters.resolve<FormatterFactory<unknown>>('#' + item[1]), settings);
        return this.tryParseOperator(expression, result, true, reset);
    }

    /**
     * Tries to parse an operator expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {() => void} [reset] - The reset function.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed operator expression.
     */
    public tryParseOperator(expression: StringCursor, lhs: ExpressionsWithLength, parseFormatter: boolean, reset?: () => void)
    {
        const operator = expression.exec(/\s*([<>=!+\-/*&|\?\.#\[\(]+)\s*/);
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
                    expression.offset--;
                    return this.parseFunctionCall(expression, lhs, parseFormatter);
                case '[': {
                    rhs = this.parseAny(expression, parseFormatter, reset);
                    const member = new MemberExpression(lhs as TypedExpression<any>, rhs as TypedExpression<any>, false);
                    expression.offset++; // Skip closing bracket
                    return this.tryParseOperator(expression, member, parseFormatter, reset);
                }
                case '?.':
                case '.': {
                    this.parameters = { ...this.parameters, '': lhs as ParameterExpression<unknown> };
                    const selfReset = (() => { this.parameters = oldParameters });
                    rhs = this.parseAny(expression, parseFormatter, reset || selfReset);
                    selfReset();
                    return rhs;
                }
                case '?': {
                    const tOperator = parseTernaryOperator(operator[1]);
                    const second = this.parseAny(expression, parseFormatter, reset);

                    const operator2 = expression.exec(/\s*(:)\s*/);
                    if (!operator2)
                        throw new Error('Invalid ternary operator');

                    const third = this.parseAny(expression, parseFormatter, reset);
                    const ternary = new ParsedTernary(tOperator, lhs, second, third);
                    return ternary;
                }
                default: {
                    reset?.();
                    rhs = this.parseAny(expression, parseFormatter);
                    const binary = new ParsedBinary(parseBinaryOperator(operator[1]), lhs, rhs);
                    return ParsedBinary.applyPrecedence(binary);
                }
            }
        }
        return lhs;
    }

    /**
     * Parses a function call expression.
     * @param {string} expression - The expression to parse.
     * @param {ExpressionsWithLength} lhs - The left-hand side expression.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed function call expression.
     */
    parseFunctionCall(expression: StringCursor, lhs: ExpressionsWithLength, parseFormatter: boolean)
    {
        const results: (StrictExpressions)[] = [];

        this.parseCSV(expression, () =>
        {
            const item = this.parseAny(expression, parseFormatter);
            results.push(item as StrictExpressions);
            return item;
        }, ')');

        if (lhs?.type == ExpressionType.MemberExpression)
            return this.tryParseOperator(
                expression,
                new ParsedCall(
                    lhs.source as ExpressionsWithLength & TypedExpression<any>,
                    lhs.member,
                    results
                ),
                parseFormatter
            );

        return this.tryParseOperator(
            expression,
            new ParsedCall(
                lhs as ExpressionsWithLength & TypedExpression<any>,
                null,
                results
            ),
            parseFormatter,
        );
    }

    /**
     * Parses an array expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @param {() => void} [reset] - The reset function.
     * @returns {ExpressionsWithLength} The parsed array expression.
     */
    public parseArray(expression: StringCursor, parseFormatter: boolean, reset?: () => void)
    {
        const results: ExpressionsWithLength[] = [];
        this.parseCSV(expression, () =>
        {
            let item = this.parseAny(expression, parseFormatter);
            results.push(item);
            return item;
        }, ']');

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.tryParseOperator(expression, new ParsedArray(length, ...results.map((v, i) => new MemberExpression<any, number, any>(v as TypedExpression<any>, new ParsedNumber(i.toString()), false))), true);
    }

    /**
     * Parses a string expression.
     * @param {string} expression - The expression to parse.
     * @param {string} start - The starting character of the string.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed string expression.
     */
    public parseString(expression: StringCursor, start: '"' | "'", parseFormatter: boolean)
    {
        start = escapeRegExp(start) as '"' | "'";
        const evaluatedRegex = expression.exec(new RegExp(start + "((?:[^\\" + start + "]|\\.)*)" + start));
        if (!evaluatedRegex)
            throw new Error('Invalid string at position ' + expression.offset);

        const result = evaluatedRegex[1];
        const parsedString = new ParsedString(result);

        return this.tryParseOperator(expression, parsedString, parseFormatter);
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
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {number} The length of the parsed CSV expression.
     */
    public parseCSV(expression: StringCursor, parseItem: () => ExpressionsWithLength, end: string): number
    {
        const startOffset = expression.offset;
        expression.offset++; // Skip opening character

        for (; expression.offset < expression.length && expression.char !== end; expression.offset++)
        {
            // Skip whitespace
            while (expression.char === ' ' && expression.offset < expression.length)
                expression.offset++;

            if (expression.offset >= expression.length)
                break;

            if (expression.char === end)
            {
                expression.offset++;
                break;
            }

            parseItem(); // Remove unused assignment

            // Skip whitespace
            while (expression.char === ' ')
                expression.offset++;

            // Check for comma
            if (expression.char === ',')
            {
                expression.offset++;
                continue;
            }

            // If no comma, must be end character
            if (expression.char === end)
                break;

            throw new Error(`Expected comma or ${end} at position ${expression.offset}, but found ${expression.char}`);
        }
        expression.offset++;

        return expression.offset - startOffset;
    }

    /**
     * Parses an object expression.
     * @param {string} expression - The expression to parse.
     * @param {boolean} parseFormatter - Whether to parse formatters.
     * @param {StringCursor} cursor - The cursor tracking the current position.
     * @returns {ExpressionsWithLength} The parsed object expression.
     */
    public parseObject(expression: StringCursor, parseFormatter: boolean)
    {
        const parsedObject: { key: string, value: ExpressionsWithLength }[] = [];
        this.parseCSV(expression, () =>
        {
            const keyMatch = expression.exec(jsonKeyRegex);

            const key = keyMatch[1] || keyMatch[2] || keyMatch[3];

            const item = this.parseAny(expression, parseFormatter);
            parsedObject.push({ key, value: item });
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}');

        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this.tryParseOperator(expression, new ParsedObject(...parsedObject.map(v => new MemberExpression<any, string, any>(v.value as TypedExpression<any>, new ParsedString(v.key), false))), parseFormatter)
    }
}
