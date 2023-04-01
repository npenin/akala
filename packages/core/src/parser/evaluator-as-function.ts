import { lazy, noop } from "../helpers.js";
import { BinaryExpression, Expressions, ExpressionVisitor, MemberExpression, NewExpression, TypedExpression } from "./expressions/index.js";
import { BinaryOperator } from "./expressions/binary-operator.js";
import { ExpressionsWithLength, ParsedArray, ParsedObject } from "./parser.js";

export type ParsedFunction<T> = (context?: unknown) => T;

export class EvaluatorAsFunction extends ExpressionVisitor
{
    // private result: unknown;
    private requiresContext: boolean = false;
    private functionBody = '';

    public eval<T = unknown>(expression: ExpressionsWithLength): ParsedFunction<T>
    {
        this.visit(expression);
        const f = new Function('$$context', 'return ' + this.functionBody);

        if (this.requiresContext)
        {
            return f as (context: unknown) => T;
        }
        else
        {
            return lazy(f as () => T);
        }
    }

    async visitNew<T>(expression: NewExpression<T>): Promise<Expressions>
    {
        if (expression instanceof ParsedObject)
        {
            this.functionBody += '{';
            await this.visitEnumerable(expression.init, noop, async (m, i) =>
            {
                // this.result = null;
                const currentBody = this.functionBody;
                await this.visit(m.source);
                this.functionBody = currentBody + (i > 0 ? ',' : '') + '"' + m.member.replace('\\', '\\\\').replace('"', '\\"') + '":' + this.functionBody
                return m;
            }, () => true)
            this.functionBody += '}'
        }
        else if (expression instanceof ParsedArray)
        {
            // const result = [];
            this.functionBody += '{';
            await this.visitEnumerable(expression.init, noop, async (m, i) =>
            {
                // this.result = null;
                const currentBody = this.functionBody;
                await this.visit(m.source);
                this.functionBody = currentBody + (i > 0 ? ',' : '') + '"' + m.member.replace('\\', '\\\\').replace('"', '\\"') + '":' + this.functionBody
                return m;
            }, () => true)
            this.functionBody += '}'
        }
        else
        {
            throw new Error('not supported');
        }
        return expression;
    }

    async visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): Promise<TypedExpression<T[TMember]>>
    {
        this.requiresContext = true;
        if (arg0.source === null)
            this.functionBody += '$$context';
        else
            this.visit(arg0.source);
        switch (typeof arg0.member)
        {
            case 'string':
                this.functionBody += '["' + arg0.member.replace('\\', '\\\\').replace('"', '\\"') + '"]';
                break;
            case 'number':
                this.functionBody += '["' + arg0.member + '"]';
                break;
            case 'symbol':
                throw new Error('not supported');
        }

        return arg0;
    }

    async visitBinary(expression: BinaryExpression<ExpressionsWithLength>): Promise<typeof expression>
    {
        // const currentBody = this.functionBody;
        this.functionBody = '';
        await this.visit(expression.left);
        const left = this.functionBody;
        this.functionBody = '';
        await this.visit(expression.right);
        const right = this.functionBody;

        switch (expression.operator)
        {
            case BinaryOperator.Equal:
                this.functionBody = left + '==' + right;
                break;
            case BinaryOperator.StrictEqual:
                this.functionBody = left + '===' + right;
                break;
            case BinaryOperator.LessThan:
                this.functionBody = left + '<' + right;
                break;
            case BinaryOperator.LessThanOrEqual:
                this.functionBody = left + '<=' + right;
                break;
            case BinaryOperator.GreaterThan:
                this.functionBody = left + '>' + right;
                break;
            case BinaryOperator.GreaterThanOrEqual:
                this.functionBody = left + '>=' + right;
                break;
            case BinaryOperator.NotEqual:
                this.functionBody = left + '!=' + right;
                break;
            case BinaryOperator.StrictNotEqual:
                this.functionBody = left + '!==' + right;
                break;
            case BinaryOperator.Plus:
                this.functionBody = left + '+' + right;
                break;
            case BinaryOperator.Minus:
                this.functionBody = left + '-' + right;
                break;
            case BinaryOperator.Div:
                this.functionBody = left + '/' + right;
                break;
            case BinaryOperator.Times:
                this.functionBody = left + '*' + right;
                break;
            case BinaryOperator.Or:
                this.functionBody = left + ' || ' + right;
                break;
            case BinaryOperator.And:
                this.functionBody = left + ' && ' + right;
                break;
            case BinaryOperator.Dot:
                this.functionBody = left + '.' + right;
                break;
            default:
                throw new Error('invalid operator' + expression.operator);
        }
        return expression;
    }
}