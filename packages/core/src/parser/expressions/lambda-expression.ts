import { Expression, Expressions, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ParameterExpression } from './parameter-expression.js';
import { ExpressionVisitor } from './expression-visitor.js';


export class TypedLambdaExpression<T extends (...args: unknown[]) => unknown> extends Expression
{
    public get type(): ExpressionType.LambdaExpression { return ExpressionType.LambdaExpression; }
    public readonly parameters: Parameters<T> & Expressions[];
    constructor(public readonly body: Expressions, parameters: Parameters<T> & Expressions[])
    {
        super();
        this.parameters = parameters;
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitLambda(this);
    }
}

export type Parameters<T extends (...args: unknown[]) => unknown> = T extends () => unknown ? [] :
    T extends (a: infer T1) => unknown ? [ParameterExpression<T1>] :
    T extends (a: infer T1, b: infer T2) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>] :
    T extends (a: infer T1, b: infer T2, c: infer T3) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>, ParameterExpression<T5>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5, f: infer T6) => unknown ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>, ParameterExpression<T5>, ParameterExpression<T6>] :
    ParameterExpression<unknown>[];

export class LambdaExpression extends TypedLambdaExpression<(...args: unknown[]) => unknown>
{
    static typed<T extends (...args: unknown[]) => U, U>(body: TypedExpression<U>, parameters: Parameters<T> & Expressions[]): TypedLambdaExpression<T>
    {
        return new TypedLambdaExpression<T>(body, parameters);
    }
    constructor(public readonly body: Expressions, ...parameters: Parameters<(...args: unknown[]) => unknown>)
    {
        super(body, parameters);
    }
}

