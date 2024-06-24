/* eslint-disable @typescript-eslint/no-explicit-any */

import { BinaryExpression, BinaryOperator, ConstantExpression, MemberExpression, NewExpression, ParameterExpression, StrictExpressions, StrictTypedExpression, UnaryExpression, UnaryOperator } from '@akala/core/expressions';


var jsonKeyRegex = /^ *(?:(?:"([^"]+)")|(?:'([^']+)')|(?:([^: ]+)) *): */;
// var jsonSingleQuoteKeyRegex = /^ *'([^']+)'|([^\: ]+) *: */;

export interface ParsedAny
{
    $$length?: number;
}

export type ParsedOneOf = (ParsedAny & UnaryExpression) | (ParsedAny & StrictTypedExpression<any>) | (NewExpression<any> & ParsedAny) | ParsedBinary | ParsedArray | ParsedString | ParsedBoolean | ParsedNumber;

export class ParsedBinary extends BinaryExpression<ParsedAny & StrictExpressions> implements ParsedAny
{
    constructor(left: ParsedAny & StrictExpressions, operator: BinaryOperator, right: ParsedAny & StrictExpressions)
    {
        super(left, operator, right);
        this.$$length = this.left.$$length + ParsedBinary.operatorLength(operator) + this.right.$$length;
    }

    public static operatorLength(operator: BinaryOperator)
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
            case BinaryOperator.Modulo:
            case BinaryOperator.Div:
            case BinaryOperator.Times:
            case BinaryOperator.Pow:
                return 1;
            default:
                throw new Error('operator is not supported')
        }
    }

    public $$length: number;

    public static applyPrecedence(operation: ParsedBinary)
    {
        if (operation.operator != BinaryOperator.Plus && operation.operator != BinaryOperator.Minus)
        {
            if (operation.right && operation.right instanceof ParsedBinary)
            {
                var right = ParsedBinary.applyPrecedence(operation.right);
                switch (right.operator)
                {
                    case BinaryOperator.Plus:
                    case BinaryOperator.Minus:
                    case BinaryOperator.Or:
                        break;
                    case BinaryOperator.Times: // b*(c+d) ==> (b*c)+d
                    case BinaryOperator.Div:
                    case BinaryOperator.And:
                    case '.':
                        return new ParsedBinary(new ParsedBinary(operation.left, operation.operator, right.left), right.operator, right.right);
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

export interface ParsedArray extends ParsedAny, ConstantExpression<Array<ParsedAny>>
{
}

export class ParsedString extends ConstantExpression<string> implements ParsedAny
{
    constructor(public value: string)
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
    constructor(value: string)
    {
        super(Boolean(value));
        if (typeof value != 'undefined')
            this.$$length = value.toString().length;
    }

    public $$length: number;
}

export class Parser
{
    private parameters: { [key: string]: ParameterExpression<any> & ParsedAny } = {};
    constructor(...parameters: ParameterExpression<any>[])
    {
        if (parameters)
            parameters.forEach((param) =>
            {
                this.parameters[param.name] = param;
                this.parameters[param.name].$$length = param.name.length;
            })
    }

    public parse(expression: string): ParsedOneOf
    {
        expression = expression.trim();
        var result = this.parseAny(expression);
        return result;
    }

    public parseAny(expression: string): ParsedOneOf
    {
        switch (expression[0])
        {
            case '!':
                return this.parseNot(expression);
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

    public parseNumber(expression): ParsedOneOf
    {
        var num = /^[0-9.]/.exec(expression);
        if (num[0].length != 1 || num[0][0] != '.')
        {
            var result = new ParsedNumber(num[0]);
            return this.tryParseOperator(expression.substring(result.$$length), result);
        }
        return this.tryParseOperator(expression, this.parameters['']);
    }

    public parseNot(expression: string): ParsedOneOf
    {
        if (expression[0] == '!')
        {
            return new UnaryExpression(this.parse(expression.substring(1)), UnaryOperator.Not);
        }
        return null;
    }

    public static parseBoolean(expression: string): ParsedBoolean | (UnaryExpression & ParsedAny)
    {
        if (!expression.match(/^true|false|undefined/))
            return null;

        return new ParsedBoolean(/^true|false|undefined/.exec(expression)[0]);
    }

    public parseEval(expression: string): ParsedBoolean | (UnaryExpression & ParsedAny) | StrictTypedExpression<any> & ParsedAny | ParsedBinary
    {
        var b = Parser.parseBoolean(expression);
        if (b)
            return b;

        var output = this.parseVariable(expression);

        return this.tryParseOperator(expression.substring(output.$$length), output);
    }

    public static parseAccessor(expression: string, source: StrictTypedExpression<any>): StrictTypedExpression<any> & ParsedAny
    {
        if (expression[0] == '.')
        {
            var member: StrictTypedExpression<any> & ParsedAny = new MemberExpression(source, /^[\w0-9$]*/.exec(expression.substring(1))[0]);
            member.$$length = 1 + member.member.length;
            return member;
        }
        return source;
    }



    public parseVariable(expression: string): StrictTypedExpression<any> & ParsedAny
    {
        var item = /^[\w0-9$]*/.exec(expression)[0];

        var keys = Object.keys(this.parameters);
        if (typeof this.parameters[item] == 'undefined' && keys.length != 1)
            throw new Error(`Parameter ${item} is undefined`)


        if (this.parameters[item])
            return this.parameters[item];

        var member = Parser.parseAccessor('.' + expression, this.parameters[keys[0]]);
        member.$$length--;
        return member;
    }

    public tryParseOperator(expression: string, lhs: ParsedBinary): ParsedBinary
    public tryParseOperator(expression: string, lhs: ParsedOneOf): ParsedOneOf
    public tryParseOperator(expression: string, lhs: ParsedOneOf)
    {
        var operator = /^ *([<>=!+-/*&|.#]+) */.exec(expression);
        if (operator)
        {
            switch (operator[1])
            {
                case '.':
                    return Parser.parseAccessor(expression, lhs as any);
                default:
                    expression = expression.substring(operator[0].length);
                    var rhs = this.parse(expression);
                    var binary = new ParsedBinary(lhs, Parser.parseOperator(operator[1]), rhs)
                    binary.$$length = lhs.$$length + operator[0].length + rhs.$$length;
                    return ParsedBinary.applyPrecedence(binary);
            }
        }
        else
            return lhs;
    }

    private static parseOperator(operator: string)
    {
        switch (operator[0])
        {
            case '=':
                if (operator[1] == '=')
                    return BinaryOperator.Equal;
                break;
            case '<':
                if (operator[1] == '=')
                    return BinaryOperator.LessThanOrEqual;
                if (operator[1] == '>')
                    return BinaryOperator.NotEqual;
                return BinaryOperator.LessThan;
            case '>':
                if (operator[1] == '=')
                    return BinaryOperator.GreaterThanOrEqual;
                return BinaryOperator.GreaterThan;
            case '!':
                if (operator[1] == '=')
                    return BinaryOperator.NotEqual;
                break;
            case '+':
                return BinaryOperator.Plus;
            case '-':
                return BinaryOperator.Minus;
            case '/':
                return BinaryOperator.Div;
            case '*':
                return BinaryOperator.Times;
            case '|':
                if (operator[1] == '|')
                    return BinaryOperator.Or;
                break;
            case '&':
                if (operator[1] == '&')
                    return BinaryOperator.Or;
                break;
        }
        throw new Error(`Unknown operator at ${operator}`);
    }

    public parseArray(expression: string): ParsedArray
    {
        var results: ParsedArray = new ConstantExpression([]);
        Object.defineProperty(results, '$$length', { value: 0, enumerable: false, configurable: true, writable: true });
        Parser.parseCSV(expression, function (result)
        {
            var item = this.parseAny(result);
            item = this.tryParseOperator(result.substring(item.$$length), item);

            results.value.push(item);
            results.$$length += item.$$length;
            return item;
        }, ']', results.value);
        return results;
    }

    public parseString(expression: string, start: string): ParsedOneOf
    {
        var evaluatedRegex = new RegExp("^" + start + "((?:[^\\" + start + "]|\\.)+)" + start).exec(expression);
        // console.log(arguments);
        var result = evaluatedRegex[1];
        var parsedString = new ParsedString(result);
        return this.tryParseOperator(expression.substring(evaluatedRegex[0].length), parsedString);
    }

    private static parseCSV<T extends (Array<any> & ParsedAny)>(expression: string, parseItem: (expression: string) => ParsedAny, end: string, output: T): T
    {
        expression = expression.substring(1);
        output.$$length++;
        do
        {
            var item = parseItem(expression);

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
        return output;
    }

    public parseObject(expression: string)
    {
        var parsedObject: MemberExpression<any, any, any>[] & ParsedAny = [];
        Object.defineProperty(parsedObject, '$$length', { value: 0, enumerable: false, writable: true, configurable: true });
        var result = Parser.parseCSV(expression, function (expression)
        {
            // var length = 0;
            var keyMatch = jsonKeyRegex.exec(expression);

            var key = keyMatch[1] || keyMatch[2] || keyMatch[3];
            //console.log(keyMatch);
            var length = keyMatch[0].length + keyMatch.index;
            expression = expression.substring(length);
            var item = this.parseAny(expression);
            length += item.$$length;
            parsedObject.push(new MemberExpression(item, key));
            // expression = expression.substring(result[key].$$length);
            item.$$length = length;
            parsedObject.$$length += length;
            // console.log(expression);
            //console.log(length);
            return item;
        }, '}', parsedObject);

        return this.tryParseOperator(expression.substring(result.$$length), new NewExpression(...parsedObject));
    }
}