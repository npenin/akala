import { lazy, noop } from "../helpers.js";
import { BinaryExpression, ConstantExpression, Expressions, ExpressionType, MemberExpression, NewExpression, ParameterExpression, StrictExpressions, TypedExpression, TypedLambdaExpression, UnaryExpression, UnaryOperator } from "./expressions/index.js";
import { BinaryOperator } from "./expressions/binary-operator.js";
import { ExpressionsWithLength, ParsedArray, ParsedObject, ParsedString } from "./parser.js";
import { TernaryExpression } from "./expressions/ternary-expression.js";
import { TernaryOperator } from "./expressions/ternary-operator.js";
import { ExpressionVisitor } from "./expressions/visitors/expression-visitor.js";

export type ParsedFunction<T> = (context?: unknown) => T;

export class EvaluatorAsFunction extends ExpressionVisitor
{
    // private result: unknown;
    private requiresContext: boolean = false;
    private functionBody = '';

    public static singleParameterDefaultName = '$$context'

    public eval<T extends (...args: unknown[]) => unknown>(expression: TypedLambdaExpression<T>): T
    public eval<T = unknown>(expression: ExpressionsWithLength): ParsedFunction<T>
    public eval<T = unknown>(expression: Expressions | TypedLambdaExpression<(...args: unknown[]) => T>): ParsedFunction<T> | T
    {
        let args: string[];
        if (expression.type == ExpressionType.LambdaExpression)
        {
            if (expression.parameters.length > 1 && !expression.parameters.every(p => p.name))
            {
                throw new Error('Unnamed parameters are not supported');
            }
            args = expression.parameters.map(p => p.name || EvaluatorAsFunction.singleParameterDefaultName);
        }
        else
            args = [EvaluatorAsFunction.singleParameterDefaultName];
        this.visit(expression);
        const f = new Function(...args, 'return ' + this.functionBody);
        this.functionBody = '';
        if (this.requiresContext)
        {
            return f as (context: unknown) => T;
        }
        else
        {
            return lazy(f as () => T);
        }
    }

    visitTernary<T extends Expressions = StrictExpressions>(expression: TernaryExpression<T>): TernaryExpression<Expressions>
    {
        this.visit(expression.first);
        switch (expression.operator)
        {
            case TernaryOperator.Question:
                this.functionBody += '?';
                this.visit(expression.second);
                this.functionBody += ':';
                this.visit(expression.third);
                break;

            case TernaryOperator.Unknown:
            default:
                throw new Error('invalid operator' + expression.operator);
        }

        return expression;
    }

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.functionBody += JSON.stringify(arg0.value);
        return arg0;
    }

    visitNew<T>(expression: NewExpression<T>): StrictExpressions
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
            this.functionBody += '[';
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
            this.functionBody += ']'
        }
        else
        {
            throw new Error('not supported');
        }
        return expression;
    }

    private static isSafe(value: string)
    {
        return /^[a-zA-Z0-9_$]+$/.test(value);
    }

    visitParameter(arg0: ParameterExpression<unknown>): StrictExpressions
    {
        this.functionBody += arg0.name || EvaluatorAsFunction.singleParameterDefaultName;
        return arg0;
    }

    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        const bodyBeginning = this.functionBody;
        this.functionBody = '';
        if (!arg0.source)
        {
            this.requiresContext = true;
            this.functionBody = EvaluatorAsFunction.singleParameterDefaultName;
        }
        else
            this.visit(arg0.source);

        const currentBody = this.functionBody;
        this.functionBody = '';
        let isSafeMember = false;
        if (arg0.member instanceof ParsedString)
        {
            this.functionBody = arg0.member.value;
            isSafeMember = EvaluatorAsFunction.isSafe(this.functionBody);
        }
        else
            this.visit(arg0.member);
        if (arg0.optional)
            if (isSafeMember)
                this.functionBody = currentBody + '?.' + this.functionBody;
            else
                this.functionBody = currentBody + ' && ' + currentBody + '[' + this.functionBody + ']';
        else
            if (isSafeMember)
                this.functionBody = currentBody + '.' + this.functionBody;
            else
                this.functionBody = currentBody + '[' + this.functionBody + ']';

        this.functionBody = bodyBeginning + this.functionBody;
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