import { Expressions, TypedExpression, IEnumerable, StrictExpressions, StrictTypedExpression, UnknownExpression } from './expression';
import { ExpressionType } from './expression-type';
import { BinaryExpression } from './binary-expression';
import { UnaryExpression } from './unary-expression';
import { ParameterExpression } from './parameter-expression';
import { ConstantExpression } from './constant-expression';
import { TypedLambdaExpression, Parameters } from './lambda-expression';
import { MemberExpression } from './member-expression';
import { CallExpression } from './call-expression';
import { ApplySymbolExpression } from './apply-symbol-expression';
import { NewExpression } from './new-expression';
import { IVisitable } from './visitable';


export type EqualityComparer<T> = (a: T, b: T) => boolean;

export class ExpressionVisitor
{
    public visit<T>(expression: StrictTypedExpression<T>): Promise<StrictTypedExpression<T>>
    public visit<T>(expression: TypedExpression<T>): Promise<TypedExpression<T>>
    public visit(expression: StrictExpressions): Promise<StrictExpressions>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<this, Promise<any>>): Promise<Expressions>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public visit(expression: IVisitable<this, Promise<any>>): Promise<Expressions>
    {
        return expression.accept(this);
    }

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
        throw new Error("unsupported type");
    }

    async visitNew<T>(expression: NewExpression<T>): Promise<Expressions>
    {
        var members: MemberExpression<T, keyof T, T[keyof T]>[] = await this.visitArray(expression.init as any) as any;
        if (members !== expression.init)
        {
            return new NewExpression<T>(...members);
        }
        return expression;
    }

    async visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>): Promise<Expressions>
    {
        var source = await this.visit(arg0.source);
        var arg = await this.visit(arg0.argument);
        if (source !== arg0.source || arg !== arg0.argument)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new ApplySymbolExpression<T, U>(source, arg0.symbol, arg);
        }
        return arg0;
    }
    async visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): Promise<Expressions>
    {
        var source = await this.visit(arg0.source);
        var args = (await this.visitArray(arg0.arguments)) as StrictExpressions[];
        if (source !== arg0.source || args !== arg0.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new CallExpression<T, TMethod>(source, arg0.method, args);
        }
        return arg0;
    }
    async visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): Promise<TypedExpression<T[TMember]>>
    {
        var source = await this.visit(arg0.source);
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
    async visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>): Promise<Expressions>
    {
        var parameters = await this.visitArray(arg0.parameters) as unknown as Parameters<T>;
        var body = await this.visit(arg0.body);
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, arg0.parameters);
        return arg0;
    }

    private static defaultComparer<T>(a: T, b: T)
    {
        return a === b;
    }

    async visitEnumerable<T>(map: IEnumerable<T>, addToNew: (item: T) => void, visitSingle: (item: T, index: number) => PromiseLike<T>, compare?: EqualityComparer<T>): Promise<void>
    {
        if (!compare)
            compare = ExpressionVisitor.defaultComparer;
        var tmp: T[] = [];
        let i = 0;
        for (var set of map)
        {
            var newSet = await visitSingle.call(this, set, i)
            if (!compare(newSet, set))
                tmp.forEach(addToNew);
            else
                tmp.push(set);
            i++;
        }
    }

    async visitArray<T extends IVisitable<ExpressionVisitor, Promise<U>>, U extends T>(parameters: T[]): Promise<T[]>
    {
        var result: T[] = null;
        await this.visitEnumerable(parameters, function (set)
        {
            if (!result)
                result = new Array<T>(parameters.length);
            result.push(set as T);
        }, this.visit);
        return result || parameters;
    }
    async visitConstant(arg0: ConstantExpression<unknown>): Promise<Expressions>
    {
        return arg0;
    }
    async visitParameter(arg0: ParameterExpression<unknown>): Promise<Expressions>
    {
        return arg0;
    }
    async visitUnary(arg0: UnaryExpression): Promise<Expressions>
    {
        var operand = await this.visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }
    async visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): Promise<BinaryExpression<Expressions>>
    {
        var left = await this.visit(expression.left);
        var right = await this.visit(expression.right);

        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }

}