import { Expressions, TypedExpression, IEnumerable, StrictExpressions, StrictTypedExpression, UnknownExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { BinaryExpression } from './binary-expression.js';
import { UnaryExpression } from './unary-expression.js';
import { ParameterExpression } from './parameter-expression.js';
import { ConstantExpression } from './constant-expression.js';
import { TypedLambdaExpression, Parameters } from './lambda-expression.js';
import { MemberExpression } from './member-expression.js';
import { CallExpression } from './call-expression.js';
import { ApplySymbolExpression } from './apply-symbol-expression.js';
import { NewExpression } from './new-expression.js';
import { IVisitable } from './visitable.js';
import { FormatExpression } from '../parser.js';


export type EqualityComparer<T> = (a: T, b: T) => boolean;

export class ExpressionVisitor
{
    public visit<T>(expression: StrictTypedExpression<T>): StrictTypedExpression<T>
    public visit<T>(expression: TypedExpression<T>): TypedExpression<T>
    public visit(expression: StrictExpressions): StrictExpressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<this, any>): Expressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<this, any>): Expressions
    {
        return expression.accept(this);
    }

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
        throw new Error("unsupported type");
    }


    visitFormat(expression: FormatExpression)
    {
        const source = this.visit(expression.lhs);
        if (expression.settings)
        {
            const settings = this.visit(expression.settings)
            if (source !== expression.lhs || settings != expression.settings)
            {
                return new FormatExpression(source, expression.formatter, expression.settings);
            }
        }
        if (source !== expression.lhs)
            return new FormatExpression(source, expression.formatter, null)
        return expression;
    }

    visitNew<T>(expression: NewExpression<T>): Expressions
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        var members: MemberExpression<T, keyof T, T[keyof T]>[] = this.visitArray(expression.init as any) as any;
        if (members !== expression.init)
        {
            return new NewExpression<T>(...members);
        }
        return expression;
    }

    visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>): Expressions
    {
        var source = this.visit(arg0.source);
        var arg = this.visit(arg0.argument);
        if (source !== arg0.source || arg !== arg0.argument)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new ApplySymbolExpression<T, U>(source, arg0.symbol, arg);
        }
        return arg0;
    }
    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): Expressions
    {
        var source = this.visit(arg0.source);
        var args = (this.visitArray(arg0.arguments)) as StrictExpressions[];
        if (source !== arg0.source || args !== arg0.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new CallExpression<T, TMethod>(source, arg0.method, args);
        }
        return arg0;
    }
    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        if (arg0.source)
            var source = this.visit(arg0.source);
        else
            source = arg0.source;
        if (source !== arg0.source)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new MemberExpression<T, TMember, T[TMember]>(source, arg0.member);

        }
        return arg0;
    }
    isTypedExpression<T>(source: Expressions): source is TypedExpression<T>
    {
        return source && (
            source.type == ExpressionType.ConstantExpression ||
            source.type == ExpressionType.ParameterExpression ||
            source.type == ExpressionType.MemberExpression ||
            source.type == ExpressionType.ApplySymbolExpression ||
            source.type == ExpressionType.NewExpression);
    }
    visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>): Expressions
    {
        var parameters = this.visitArray(arg0.parameters) as unknown as Parameters<T>;
        var body = this.visit(arg0.body);
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, arg0.parameters);
        return arg0;
    }

    private static defaultComparer<T>(a: T, b: T)
    {
        return a === b;
    }

    visitEnumerable<T>(map: IEnumerable<T>, addToNew: (item: T) => void, visitSingle: (item: T, index: number) => T, compare?: EqualityComparer<T>): void
    {
        if (!compare)
            compare = ExpressionVisitor.defaultComparer;
        var tmp: T[] = [];
        let i = 0;
        for (var set of map)
        {
            var newSet = visitSingle.call(this, set, i)
            if (!compare(newSet, set))
                tmp.forEach(addToNew);
            else
                tmp.push(set);
            i++;
        }
    }

    visitArray<T extends IVisitable<ExpressionVisitor, U>, U extends T>(parameters: T[]): T[]
    {
        var result: T[] = null;
        this.visitEnumerable(parameters, function (set)
        {
            if (!result)
                result = new Array<T>(parameters.length);
            result.push(set as T);
        }, this.visit);
        return result || parameters;
    }
    visitConstant(arg0: ConstantExpression<unknown>): Expressions
    {
        return arg0;
    }
    visitParameter(arg0: ParameterExpression<unknown>): Expressions 
    {
        return arg0;
    }
    visitUnary(arg0: UnaryExpression): Expressions 
    {
        var operand = this.visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }
    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): BinaryExpression<Expressions>
    {
        var left = this.visit(expression.left);
        var right = this.visit(expression.right);

        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }

}