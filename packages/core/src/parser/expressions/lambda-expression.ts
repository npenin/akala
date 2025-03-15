import { Expression, Expressions, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ParameterExpression } from './parameter-expression.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a typed lambda expression.
 * @template T - The type of the lambda function.
 */
export class TypedLambdaExpression<T extends (...args: unknown[]) => unknown> extends Expression
{
    public get type(): ExpressionType.LambdaExpression { return ExpressionType.LambdaExpression; }
    public readonly parameters: Parameters<T>;
    /**
     * Creates an instance of TypedLambdaExpression.
     * @param {Expressions} body - The body of the lambda expression.
     * @param {...Parameters<T>} parameters - The parameters of the lambda expression.
     */
    constructor(public readonly body: Expressions, ...parameters: Parameters<T>)
    {
        super();
        this.parameters = parameters;
    }
    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor to accept.
     * @returns {any} The result of the visitor's visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitLambda(this);
    }
}

/**
 * Represents the parameters of a lambda function.
 * @template T - The type of the lambda function.
 */
export type Parameters<T> =
    T extends (a: infer T1) => unknown ? [ParameterExpression<T1>] :
    T extends (a: infer T1, b: infer T2) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>] :
    T extends (a: infer T1, b: infer T2, c: infer T3) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>, ParameterExpression<T5>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5, f: infer T6) => unknown ? [
        T1 extends never | void ? void : ParameterExpression<T1>,
        T2 extends never | void ? void : ParameterExpression<T2>,
        T3 extends never | void ? void : ParameterExpression<T3>,
        T4 extends never | void ? void : ParameterExpression<T4>,
        T5 extends never | void ? void : ParameterExpression<T5>,
        T6 extends never | void ? void : ParameterExpression<T6>
    ] :
    T extends (...args: unknown[]) => unknown ? ParameterExpression<unknown>[] : never;

/**
 * Represents a lambda expression.
 */
export class LambdaExpression extends TypedLambdaExpression<(...args: unknown[]) => unknown>
{
    /**
     * Creates a typed lambda expression.
     * @template T - The type of the lambda function.
     * @template U - The return type of the lambda function.
     * @param {TypedExpression<U>} body - The body of the lambda expression.
     * @param {Parameters<T>} parameters - The parameters of the lambda expression.
     * @returns {TypedLambdaExpression<T>} The created typed lambda expression.
     */
    static typed<T extends (...args: unknown[]) => U, U>(body: TypedExpression<U>, parameters: Parameters<T>): TypedLambdaExpression<T>
    {
        return new TypedLambdaExpression<T>(body, ...parameters);
    }
    /**
     * Creates an instance of LambdaExpression.
     * @param {Expressions} body - The body of the lambda expression.
     * @param {...Parameters<(...args: unknown[]) => unknown>} parameters - The parameters of the lambda expression.
     */
    constructor(public readonly body: Expressions, ...parameters: Parameters<(...args: unknown[]) => unknown>)
    {
        super(body, ...parameters);
    }
}

