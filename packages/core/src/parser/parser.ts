import { module } from '../helpers';
import { FormatterFactory } from '../formatters/common';
import { BinaryOperator } from './expressions/binary-operator';
import { BinaryExpression, ConstantExpression, Expression, Expressions, ExpressionType, ExpressionVisitor, MemberExpression, NewExpression, TypedExpression, UnaryExpression, UnaryOperator } from './expressions';
import { identity } from '../formatters/identity';
import { negate } from '../formatters/negate';
import { booleanize } from '../formatters/booleanize';


const jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^: ]+)) *): */;
// var jsonSingleQuoteKeyRegex = /^ *'([^']+)'|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

export type ParsedOneOf = ParsedObject | ParsedArray | ParsedString | ParsedBoolean | ParsedNumber | ParsedBinary;

export type ExpressionsWithLength = (TypedExpression<unknown> | Expressions) & ParsedAny;

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

export class FormatExpression extends Expression implements ParsedAny
{
    constructor(public readonly lhs: ExpressionsWithLength | (TypedExpression<unknown> & ParsedAny), public readonly formatter: FormatterFactory<unknown, unknown>, public readonly settings: unknown)
    {
        super();
    }

    get type(): ExpressionType.Unknown
    {
        return ExpressionType.Unknown;
    }

    async accept(visitor: ExpressionVisitor): Promise<Expressions>
    {
        await visitor.visit(this.lhs);
        return this;
    }

    public $$length: number;

}

export class ParsedBinary extends BinaryExpression<ExpressionsWithLength> implements ParsedAny
{
    constructor(operator: BinaryOperator, left: ExpressionsWithLength, public right: ExpressionsWithLength)
    {
        super(left, operator, right);
        this.$$length = this.left.$$length + operatorLength(this.operator) + this.right.$$length;
    }

    public $$length: number;

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
                    case BinaryOperator.Dot:
                        var left = operation.left;
                        return new ParsedBinary(right.operator, new ParsedBinary(operation.operator, left, right.left), right.right);
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

export class ParsedObject<T extends object = object> extends NewExpression<T> implements ParsedAny
{

    constructor(public $$length: number, ...init: MemberExpression<T, keyof T, T[keyof T]>[])
    {
        super(...init);
    }
}
export class ParsedArray extends NewExpression<unknown[]> implements ParsedAny
{

    constructor(public $$length: number, ...init: MemberExpression<unknown[], number, unknown>[])
    {
        super(...init);
    }
}

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

export class ParsedNumber extends ConstantExpression<number> implements ParsedAny
{
    constructor(value: string)
    {
        super(Number(value));
        this.$$length = value.length;
    }

    public $$length: number;
}

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

export class Parser
{
    public parse(expression: string): ExpressionsWithLength
    {
        expression = expression.trim();
        return this.parseAny(expression);
    }

    public parseAny(expression: string): ExpressionsWithLength
    {
        switch (expression[0])
        {
            case '{':
                return this.parseObject(expression);
            case '[':
                return this.parseArray(expression);
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

    public parseNumber(expression)
    {
        const result = new ParsedNumber(/^[0-9.]/.exec(expression)[0]);

        return this.tryParseOperator(expression.substring(result.$$length), result);
    }

    public parseBoolean(expression): ParsedBoolean
    {
        let formatter: (o: unknown) => unknown = identity;
        if (expression[0] == '!')
        {
            formatter = negate;
            expression = expression.substring(1);
        }
        if (expression[0] == '!')
        {
            formatter = booleanize;
            expression = expression.substring(1);
        }

        if (/^true|false|undefined/.exec(expression))
        {
            const result = new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
            if (formatter !== identity)
            {
                const newResult = new ParsedBoolean(formatter(result.value) as boolean);
                newResult.$$length = result.$$length;
                return newResult;
            }
            return result;
        }
        return null;
    }

    public parseEval(expression: string)
    {
        const b = this.parseBoolean(expression);
        if (b)
            return b;

        return this.parseFunction(expression);
    }

    public parseFunction(expression: string): ParsedBinary
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

        const item = /^[\w0-9.$]*/.exec(expression)[0];
        length += item.length;

        let result: ExpressionsWithLength = item.split('.').reduce((previous, current) => new MemberExpression(previous, current), null as TypedExpression<any>)
        result.$$length = length;
        if (typeof operator != 'undefined')
        {
            result = new UnaryExpression(result, operator);
            result.$$length = length;
        }
        return this.tryParseOperator(expression.substring(item.length), result);
    }

    public parseFormatter(expression: string, lhs: ExpressionsWithLength): ExpressionsWithLength
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

        const result = new FormatExpression(lhs, formatter, settings);
        result.$$length = lhs.$$length + item[0].length + ((settings && settings.$$length + 1) || 0);
        return result;
    }

    public tryParseOperator(expression: string, lhs: ExpressionsWithLength)
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
                    var rhs = this.parseAny(expression);
                    var binary = new ParsedBinary(parseOperator(operator[1]), lhs, rhs)
                    binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    return ParsedBinary.applyPrecedence(binary);
            }
        }
        else
            return lhs;
    }

    public parseArray(expression: string)
    {
        const results: ExpressionsWithLength[] & ParsedAny = [];
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        // const isFunction = false;
        const length = this.parseCSV(expression, (result) =>
        {
            let item = this.parseAny(result);
            item = this.tryParseOperator(result.substring(item.$$length), item);
            results.push(item);
            results.$$length += item.$$length;
            return item;
        }, ']');

        return new ParsedArray(length, ...results.map((v, i) => new MemberExpression<any, number, any>(v as TypedExpression<any>, i)));
    }

    public parseString(expression: string, start: string)
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

    public parseCSV(expression: string, parseItem: (expression: string) => ExpressionsWithLength, end: string): number
    {
        expression = expression.substring(1);
        let length = 1;
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
            length += next[0].length;
        }
        while (expression[0] != end);
        length += end.length;
        // console.log(output.$$length);
        return length;
    }

    public parseObject(expression: string)
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
            const item = this.parseAny(expression);
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

        return this.tryParseOperator(expression.substring(result), new ParsedObject(result, ...parsedObject.map(v => new MemberExpression<any, string, any>(v.value as TypedExpression<any>, v.key))))
    }
}