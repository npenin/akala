import { Expressions, TypedExpression, IEnumerable, StrictExpressions, StrictTypedExpression, UnknownExpression } from '../expression.js';
import { ExpressionType } from '../expression-type.js';
import { BinaryExpression } from '../binary-expression.js';
import { UnaryExpression } from '../unary-expression.js';
import { ParameterExpression } from '../parameter-expression.js';
import { ConstantExpression } from '../constant-expression.js';
import { TypedLambdaExpression, Parameters } from '../lambda-expression.js';
import { MemberExpression } from '../member-expression.js';
import { CallExpression } from '../call-expression.js';
import { ApplySymbolExpression } from '../apply-symbol-expression.js';
import { NewExpression } from '../new-expression.js';
import { IVisitable } from '../visitable.js';
import { FormatExpression } from '../../parser.js';
import { TernaryExpression } from '../ternary-expression.js';


export type EqualityComparer<T> = (a: T, b: T) => boolean;

export class ExpressionVisitor
{
    public visit<T>(expression: StrictTypedExpression<T>): StrictTypedExpression<T>
    public visit<T>(expression: TypedExpression<T>): TypedExpression<T>
    public visit(expression: StrictExpressions): StrictExpressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<ExpressionVisitor, any>): Expressions
    {
        return expression.accept(this);
    }

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
        throw new Error("unsupported type");
    }


    visitFormat<TOutput>(expression: FormatExpression<TOutput>)
    {
        const source = this.visit(expression.lhs);
        if (expression.settings)
        {
            const settings = this.visit(expression.settings)
            if (source !== expression.lhs || settings != expression.settings)
            {
                return new FormatExpression<TOutput>(source, expression.formatter, settings);
            }
        }
        if (source !== expression.lhs)
            return new FormatExpression<TOutput>(source, expression.formatter, null)
        return expression;
    }

    visitNew<T>(expression: NewExpression<T>): StrictExpressions
    {
        //eslint-disable-next-line @typescript-eslint/no-explicit-any
        var members: MemberExpression<T, keyof T, T[keyof T]>[] = this.visitArray(expression.init as any) as any;
        if (members !== expression.init)
        {
            return new NewExpression<T>(...members);
        }
        return expression;
    }

    visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>): StrictExpressions
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
    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        var source = this.visit(arg0.source);
        var args = (this.visitArray(arg0.arguments as StrictExpressions[])) as StrictExpressions[];
        if (source !== arg0.source || args !== arg0.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new CallExpression<T, TMethod>(source, arg0.method, args);
        }
        return arg0;
    }
    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): StrictExpressions
    {
        if (arg0.source)
            var source = this.visit(arg0.source);
        else
            source = arg0.source;

        const member = this.visit(arg0.member);

        if (source !== arg0.source || arg0.member !== member)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new MemberExpression<T, TMember, T[TMember]>(source, member, arg0.optional);

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
            source.type == ExpressionType.NewExpression ||
            source.type == ExpressionType.TernaryExpression && this.isTypedExpression(source.second) && this.isTypedExpression(source.third));
    }
    visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>): StrictExpressions
    {
        var parameters = this.visitArray(arg0.parameters as Expressions[]) as unknown as Parameters<T>;
        var body = this.visit(arg0.body);
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, ...arg0.parameters);
        return arg0;
    }

    private static defaultComparer<T>(a: T, b: T)
    {
        return a === b;
    }

    visitEnumerable<T, U extends T>(map: IEnumerable<T>, addToNew: (item: U, i: number) => void, visitSingle: (item: T, index: number) => U, compare?: EqualityComparer<T>): void
    {
        if (!compare)
            compare = ExpressionVisitor.defaultComparer;
        var tmp: T[] = [];
        let i = 0;
        for (var set of map)
        {
            var newSet = visitSingle.call(this, set, i)
            if (!compare(newSet, set))
            {
                if (tmp)
                {
                    tmp.forEach(addToNew);
                    tmp = null;
                }
            }
            if (!tmp)
                addToNew(newSet, i);
            else
                tmp.push(set);
            i++;
        }
    }

    visitArray<T extends IVisitable<ExpressionVisitor, U>, U extends T>(parameters: T[], preVisit?: (expression: T, index: number) => void): U[]
    {
        var result: U[] = null;
        this.visitEnumerable<T, U>(parameters, function (set, i)
        {
            if (!result)
                result = new Array<U>(parameters.length);
            result[i] = set;
        }, preVisit ? (e, i) =>
        {
            preVisit(e, i);
            return this.visit(e) as unknown as U;
        } : e => this.visit(e) as unknown as U);
        return result || parameters as U[];
    }
    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        return arg0;
    }
    visitParameter(arg0: ParameterExpression<unknown>): StrictExpressions 
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

    visitTernary<T extends Expressions = StrictExpressions>(expression: TernaryExpression<T>): TernaryExpression<Expressions>
    {
        const first = this.visit(expression.first);
        const second = this.visit(expression.second);
        const third = this.visit(expression.third);

        if (first !== expression.first || second !== expression.second || third !== expression.third)
            return new TernaryExpression<Expressions>(first, expression.operator, second, third);
        return expression;
    }

}