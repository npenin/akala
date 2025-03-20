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
    /** @override */
    public get type(): ExpressionType.LambdaExpression { return ExpressionType.LambdaExpression; }

    /** All parameters defined for this lambda expression */
    public readonly parameters: Parameters<T>;

    /**
     * Initialize a new typed lambda expression instance
     * @param {Expressions} body - Expression representing the lambda's execution logic
     * @param {Parameters<T>} parameters - List of parameter definitions for this lambda
     */
    constructor(public readonly body: Expressions, ...parameters: Parameters<T>)
    {
        super();
        this.parameters = parameters;
    }

    /**
     * Accepts an expression visitor as part of the visitor pattern
     * @param visitor - Visitor instance implementing the lambda visitation logic
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitLambda(this);
    }
}

/** 
 * Infers parameter types from a function type and creates corresponding ParameterExpression instances.
 * @template T - The function type from which parameters are inferred.
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
     * Creates a strongly-typed lambda expression instance.
     * @template T - The function type representing the lambda's signature.
     * @template U - The return type of the lambda function.
     * @param {TypedExpression<U>} body - The expression representing the lambda's body.
     * @param {Parameters<T>} parameters - Array of parameter expressions matching the function's signature.
     * @returns {TypedLambdaExpression<T>} A new typed lambda expression instance.
     */
    static typed<T extends (...args: unknown[]) => U, U>(body: TypedExpression<U>, parameters: Parameters<T>): TypedLambdaExpression<T>
    {
        return new TypedLambdaExpression<T>(body, ...parameters);
    }

    /**
     * Creates a new LambdaExpression instance.
     * @param {Expressions} body - The expression tree representing the lambda's execution logic.
     * @param {...Parameters<(...args: unknown[]) => unknown>} parameters - List of parameter expressions defining the lambda's input.
     */
    constructor(public readonly body: Expressions, ...parameters: Parameters<(...args: unknown[]) => unknown>)
    {
        super(body, ...parameters);
    }
}
