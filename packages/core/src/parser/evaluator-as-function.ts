import { lazy, noop } from "../helpers.js";
import { BinaryExpression, ConstantExpression, Expressions, ExpressionVisitor, MemberExpression, NewExpression, TypedExpression, UnaryExpression, UnaryOperator } from "./expressions/index.js";
import { BinaryOperator } from "./expressions/binary-operator.js";
import { ExpressionsWithLength, ParsedArray, ParsedObject } from "./parser.js";

export type ParsedFunction<T> = (context?: unknown) => T;

export class EvaluatorAsFunction extends ExpressionVisitor
{
    // private result: unknown;
    private requiresContext: boolean = false;
    private functionBody = '';

    public async eval<T = unknown>(expression: ExpressionsWithLength): Promise<ParsedFunction<T>>
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

    visitConstant(arg0: ConstantExpression<unknown>): Expressions
    {
        this.functionBody += JSON.stringify(arg0.value);
        return arg0;
    }

    visitNew<T>(expression: NewExpression<T>): Expressions
    {
        if (expression instanceof ParsedObject)
        {
            this.functionBody += '{';
            this.visitEnumerable(expression.init, noop, (m, i) =>
            {
                // this.result = null;
                const currentBody = this.functionBody;
                this.functionBody = '';
                this.visit(m.source);
                const newBody = this.functionBody;
                this.functionBody = '';
                this.visit(m.member)
                this.functionBody = currentBody + (i > 0 ? ',' : '') + '"' + this.functionBody.replace('\\', '\\\\').replace('"', '\\"') + '":' + newBody
                return m;
            }, () => true)
            this.functionBody += '}'
        }
        else if (expression instanceof ParsedArray)
        {
            // const result = [];
            this.functionBody += '{';
            this.visitEnumerable(expression.init, noop, (m, i) =>
            {
                // this.result = null;
                const currentBody = this.functionBody;
                this.functionBody = '';
                this.visit(m.source);
                const newBody = this.functionBody;
                this.functionBody = '';
                this.visit(m.member)
                this.functionBody = currentBody + (i > 0 ? ',' : '') + '"' + this.functionBody.replace('\\', '\\\\').replace('"', '\\"') + '":' + newBody
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

    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        this.requiresContext = true;
        if (arg0.source === null)
            this.functionBody += '$$context';
        else
            this.visit(arg0.source);

        const currentBody = this.functionBody;
        this.functionBody = '';
        this.visit(arg0.member);
        this.functionBody = currentBody + '[' + this.functionBody + ']';

        return arg0;
    }

    visitUnary(arg0: UnaryExpression): Expressions
    {
        this.visit(arg0.operand);
        switch (arg0.operator)
        {
            case UnaryOperator.Not:
                this.functionBody = '!' + this.functionBody;
                break;
            case UnaryOperator.NotNot:
                this.functionBody = '!!' + this.functionBody;
                break;
        }
        return arg0;
    }

    visitBinary(expression: BinaryExpression<ExpressionsWithLength>): typeof expression
    {
        // const currentBody = this.functionBody;
        this.functionBody = '';
        this.visit(expression.left);
        const left = this.functionBody;
        this.functionBody = '';
        this.visit(expression.right);
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