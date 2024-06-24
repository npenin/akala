import { Expression, Expressions, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ParameterExpression } from './parameter-expression.js';
import { ExpressionVisitor } from './expression-visitor.js';


export class TypedLambdaExpression<T extends (...args: unknown[]) => unknown> extends Expression
{
    public get type(): ExpressionType.LambdaExpression { return ExpressionType.LambdaExpression; }
    public readonly parameters: Parameters<T>;
    constructor(public readonly body: Expressions, ...parameters: Parameters<T>)
    {
        super();
        this.parameters = parameters;
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitLambda(this);
    }
}


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

export class LambdaExpression extends TypedLambdaExpression<(...args: unknown[]) => unknown>
{
    static typed<T extends (...args: unknown[]) => U, U>(body: TypedExpression<U>, parameters: Parameters<T>): TypedLambdaExpression<T>
    {
        return new TypedLambdaExpression<T>(body, ...parameters);
    }
    constructor(public readonly body: Expressions, ...parameters: Parameters<(...args: unknown[]) => unknown>)
    {
        super(body, ...parameters);
    }
}

