import { Expression, Expressions, TypedExpression } from "./expression";
import { ExpressionType } from "./expression-type";
import { ParameterExpression } from "./parameter-expression";
import { ExpressionVisitor } from "./expression-visitor";


export class TypedLambdaExpression<T extends (...args: any[]) => any> extends Expression
{
    public get type(): ExpressionType.LambdaExpression { return ExpressionType.LambdaExpression; }
    public readonly parameters: Parameter<T> & Expressions[];
    constructor(public readonly body: Expressions, parameters: Parameter<T> & Expressions[])
    {
        super();
        this.parameters = parameters;
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitLambda(this);
    }
}

export type Arguments<T extends (...args: any[]) => any> = T extends () => any ? void :
    T extends (a: infer T1) => any ? [T1] :
    T extends (a: infer T1, b: infer T2) => any ? [T1, T2] :
    T extends (a: infer T1, b: infer T2, c: infer T3) => any ? [T1, T2, T3] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4) => any ? [T1, T2, T3, T4] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5) => any ? [T1, T2, T3, T4, T5] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5, f: infer T6) => any ? [T1, T2, T3, T4, T5, T6] :
    never;


export type Parameter<T extends (...args: any[]) => any> = T extends () => any ? void :
    T extends (a: infer T1) => any ? [ParameterExpression<T1>] :
    T extends (a: infer T1, b: infer T2) => any ? [ParameterExpression<T1>, ParameterExpression<T2>] :
    T extends (a: infer T1, b: infer T2, c: infer T3) => any ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4) => any ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5) => any ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>, ParameterExpression<T5>] :
    T extends (a: infer T1, b: infer T2, c: infer T3, d: infer T4, e: infer T5, f: infer T6) => any ? [ParameterExpression<T1>, ParameterExpression<T2>, ParameterExpression<T3>, ParameterExpression<T4>, ParameterExpression<T5>, ParameterExpression<T6>] :
    never;

export class LambdaExpression extends TypedLambdaExpression<(...args: any[]) => any>
{
    static typed<T extends (...args: any[]) => U, U>(body: TypedExpression<U>, parameters: Parameter<T> & Expressions[]): TypedLambdaExpression<T>
    {
        return new TypedLambdaExpression<T>(body, parameters);
    }
    constructor(public readonly body: Expressions, ...parameters: ParameterExpression<any>[])
    {
        super(body, parameters as any);
    }
}

