import { ExpressionType } from './expression-type';
import { TypedLambdaExpression } from './lambda-expression';
import { BinaryExpression } from './binary-expression';
import { UnaryExpression } from './unary-expression';
import { MemberExpression } from './member-expression';
import { ConstantExpression } from './constant-expression';
import { ParameterExpression } from './parameter-expression';
import { CallExpression } from './call-expression';
import { ApplySymbolExpression } from './apply-symbol-expression';
import { NewExpression } from './new-expression';
import { ExpressionVisitor } from './expression-visitor';

export type UnknownExpression = { type: ExpressionType.Unknown, accept(visitor: ExpressionVisitor): Promise<Expressions> };

export type StrictTypedExpression<T> = ConstantExpression<T> | ParameterExpression<T> | MemberExpression<any, any, T> | ApplySymbolExpression<any, T> | NewExpression<T>;
export type TypedExpression<T> = StrictTypedExpression<T> | UnknownExpression;

export type Predicate<T> = (a: T) => boolean;
export type Project<T, U> = (a: T) => U;
export type Project2<T, U, V> = (a: T, b: U) => V;

export type PredicateAsync<T> = (a: T) => PromiseLike<boolean>;
export type ProjectAsync<T, U> = (a: T) => PromiseLike<U>;
export type Project2Async<T, U, V> = (a: T, b: U) => PromiseLike<V>;

export type IEnumerable<T> = Iterable<T>;

export abstract class Expression
{
    abstract get type(): ExpressionType;
    abstract accept(visitor: ExpressionVisitor): Promise<Expressions>;

    /*public static lambda<T extends (...args: any[]) => any>(body: StrictExpressions, parameters: Parameter<T> & StrictExpressions[])
    {
        return new TypedLambdaExpression<T>(body, parameters);
    }

    public static binary<T extends Expressions = StrictExpressions>(left: T, operator: BinaryOperator, right: T)
    {
        return new BinaryExpression<T>(left, operator, right);
    }

    public static equal(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.Equal, right);
    }
    public static notEqual(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.NotEqual, right);
    }
    public static greaterThan(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.GreaterThan, right);
    }
    public static greaterThanOrEqual(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.GreaterThanOrEqual, right);
    }
    public static lessThan(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.LessThan, right);
    }
    public static lessThanOrEqual(left: StrictExpressions, right: StrictExpressions)
    {
        return Expression.binary(left, BinaryOperator.LessThanOrEqual, right);
    }
    public static unary(operand: StrictExpressions, operator: UnaryOperator)
    {
        return new UnaryExpression(operand, operator);
    }
    public static not(operand: StrictExpressions)
    {
        return Expression.unary(operand, UnaryOperator.Not);
    }
    public static member<T, TMember extends keyof T>(source: TypedExpression<T>, member: TMember)
    {
        return new MemberExpression<T, TMember, T[TMember]>(source, member);
    }
    public static constant<T>(value: T)
    {
        return new ConstantExpression<T>(value);
    }

    public static parameter<T>(name?: string)
    {
        return new ParameterExpression<T>(name);
    }

    public static call<T, TMethod extends keyof T>(source: TypedExpression<T>, method: TMethod, ...args: StrictExpressions[])
    {
        return new CallExpression<T, TMethod>(source, method, args);
    }
    public static new<T>(...args: MemberExpression<T, any, any>[])
    {
        return new NewExpression<T>(...args);
    }

    public static applySymbol<T, U>(source: TypedExpression<T>, symbol: symbol, arg: TypedExpression<U> | TypedLambdaExpression<(a: T) => U>): ApplySymbolExpression<T, U>
    public static applySymbol<T>(source: TypedExpression<T>, symbol: symbol, arg?: TypedLambdaExpression<Predicate<T>>): ApplySymbolExpression<T, T>
    public static applySymbol<T, U>(source: TypedExpression<T>, symbol: symbol, arg?: TypedLambdaExpression<Project<T, U>> | TypedLambdaExpression<Predicate<T>> | Exclude<TypedExpression<U>, UnknownExpression>)
    {
        return new ApplySymbolExpression<T, U>(source, symbol, arg);
    }*/
}

export type StrictExpressions = ApplySymbolExpression<any, any> |
    BinaryExpression<any> |
    CallExpression<any, any> |
    ParameterExpression<any> |
    TypedLambdaExpression<any> |
    MemberExpression<any, any, any> |
    UnaryExpression |
    ConstantExpression<any> |
    NewExpression<any>;

export type Expressions = StrictExpressions | UnknownExpression;