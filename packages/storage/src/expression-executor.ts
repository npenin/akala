// /* eslint-disable @typescript-eslint/no-explicit-any */

import { type Expressions, type StrictExpressions, type TypedExpression, type UnknownExpression, ExpressionVisitor, NewExpression, ApplySymbolExpression, LambdaExpression, BinaryExpression, CallExpression, MemberExpression, TypedLambdaExpression, ExpressionType, ConstantExpression, ParameterExpression, UnaryExpression, type Parameters, type IVisitable } from '@akala/core/expressions';
import { QuerySymbols } from './Query.js';
import { Exception } from './exceptions.js';
import { ModelDefinition } from './shared.js';
import * as  Enumerable from './Enumerable.js';
import { isPromiseLike, expressions } from "@akala/core";

type Result = Iterable<unknown> | AsyncIterable<unknown>;

export class ExpressionExecutor extends ExpressionVisitor
{
    parameterMap: Map<unknown, unknown>;
    evaluating: unknown;
    model: ModelDefinition<unknown>;
    result: unknown;

    constructor()
    {
        super();
    }

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
        throw new Error("unsupported type");
    }

    visitNew<T>(expression: NewExpression<T>)
    {

        const result = {};

        for (const m of expression.init)
        {
            this.visit(m.source);
            const value = this.result;
            this.visit(m.member)
            result[this.result as string] = value;
        }

        this.result = result;
        return expression;
    }

    visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>)
    {
        let result: Iterable<unknown> | AsyncIterable<unknown>;
        this.visit(arg0.source);
        switch (arg0.symbol)
        {
            case QuerySymbols.any:
            case QuerySymbols.count:
                result = this.result as Result;
                if (arg0.argument)
                {
                    result = [];
                    if (arg0.argument)
                    {
                        result = Enumerable.whereAsync(this.result as Result, (value) =>
                        {
                            this.result = value;
                            this.visit(arg0.argument);
                            return Promise.resolve(this.result as boolean);
                        });
                    }
                }

                this.result = Enumerable.lengthAsync(result);
                this.model = null;
                break;
            case QuerySymbols.groupby:
                result = this.result as unknown[];
                if (!arg0.argument)
                    throw new Exception('group by is missing the group criteria');

                this.result = Enumerable.groupByAsync(this.result as AsyncIterable<unknown>, (value) =>
                {
                    this.result = value;
                    this.visit(arg0.argument);
                    return Promise.resolve(this.result as string | number);
                });
                this.model = null;
                break;
            case QuerySymbols.select:
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = Enumerable.selectAsync(this.result as Result, (value) =>
                {
                    this.result = value;
                    this.visit(arg0.argument);
                    return Promise.resolve(this.result);
                });
                this.model = null;
                break;
            case QuerySymbols.where:
                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = Enumerable.whereAsync(this.result as Result, (value) =>
                {
                    this.result = value;
                    if (isPromiseLike(value))
                        return this.result = value.then(v =>
                        {
                            const oldResult = this.result;
                            this.result = v;
                            this.visit(arg0.argument);
                            const result = this.result;
                            this.result = oldResult;
                            return Promise.resolve(result as boolean);
                        });
                    this.visit(arg0.argument);
                    return Promise.resolve(this.result as boolean);
                });

                break;
            case QuerySymbols.orderby:

                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = (this.result as unknown[]).sort((a, b) =>
                {
                    this.result = a;
                    this.visit(arg0.argument);
                    this.result = b;
                    this.visit(arg0.argument);
                    if (a < b)
                        return -1;
                    if (a == b)
                        return 0;
                    return 1;
                });
                break;
            case QuerySymbols.orderbyDesc:

                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = (this.result as unknown[]).sort((a, b) =>
                {
                    this.result = a;
                    this.visit(arg0.argument);
                    this.result = b;
                    this.visit(arg0.argument);
                    if (a < b)
                        return 1;
                    if (a == b)
                        return 0;
                    return -1;
                });
                break;
            case QuerySymbols.join: //lambda => binary(joincondition, otherSource)
                var lambda = arg0.argument as LambdaExpression;
                var binary = lambda.body as BinaryExpression<Expressions>;
                binary.left;
                break;
        }

        return arg0;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TS2416
    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>)
    {
        const source = this.visit(arg0.source);
        // const src = this.result;
        const args = (this as ExpressionVisitor).visitArray(arg0.arguments as StrictExpressions[]);
        if (source !== arg0.source || args !== arg0.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new CallExpression<T, TMethod>(source, arg0.method, args, arg0.optional);
        }
        return arg0;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TS2416
    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>)
    {
        this.visit(arg0.source);
        const result = this.result;
        if (isPromiseLike(result))
        {
            this.result = result.then(v =>
            {
                const result = this.result;
                this.visit(arg0.member);
                const ret = v[this.result as string];
                this.result = result;
                return ret;
            });
        }
        else if (this.result !== null && this.result !== 'undefined')
        {
            const result = this.result;
            this.visit(arg0.member);
            this.result = result[this.result as string];
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
    visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>): StrictExpressions
    {
        const parameters = this.visitArray(arg0.parameters as IVisitable<ExpressionVisitor, StrictExpressions>[]);
        const wasEvaluating = this.evaluating;
        this.evaluating = this.result;
        const body = (this as ExpressionVisitor).visit(arg0.body);
        this.evaluating = wasEvaluating;
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, ...parameters as Parameters<T>);
        return arg0;
    }

    visitConstant(arg0: ConstantExpression<unknown>)
    {
        this.result = arg0.value;
        return arg0;
    }
    visitParameter(arg0: ParameterExpression<unknown>)
    {
        if (typeof this.evaluating !== 'undefined')
            this.result = this.evaluating;
        return arg0;
    }
    visitUnary(arg0: UnaryExpression)
    {
        const operand = (this as ExpressionVisitor).visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }
    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>)
    {
        (this as ExpressionVisitor).visit(expression.left);
        if (isPromiseLike(this.result))
            this.result = this.result.then((leftResult: number) =>
            {
                this.result = ExpressionExecutor.applyBinary(leftResult, () =>
                {
                    (this as ExpressionVisitor).visit(expression.right);
                    if (isPromiseLike(this.result))
                        return this.result as PromiseLike<number>;
                    return {
                        then(x: (right: number) => unknown) { return x(this.result as number) }
                    } as PromiseLike<number>
                }, expression.operator)

            });

        else
        {
            const left = this.result as number;
            this.result = ExpressionExecutor.applyBinary(left, () =>
            {
                (this as ExpressionVisitor).visit(expression.right);
                const right = this.result;
                if (isPromiseLike(right))
                    return right as PromiseLike<number>;
                return {
                    then(x: (right: number) => unknown) { return x(right as number) }
                } as PromiseLike<number>
            }, expression.operator)
        }
        return expression;
    }

    public static applyBinary(leftResult: number, right: () => PromiseLike<number>, operator: expressions.BinaryOperator)
    {
        switch (operator)
        {
            case expressions.BinaryOperator.Equal:
                return right().then(right => leftResult === right);
            case expressions.BinaryOperator.NotEqual:
                return right().then(right => leftResult !== right);
            case expressions.BinaryOperator.LessThan:
                return right().then((right) => leftResult < right);
            case expressions.BinaryOperator.LessThanOrEqual:
                return right().then((right) => leftResult <= right);
            case expressions.BinaryOperator.GreaterThan:
                return right().then((right) => leftResult > right);
            case expressions.BinaryOperator.GreaterThanOrEqual:
                return right().then((right) => leftResult >= right);
            case expressions.BinaryOperator.And:
                if (leftResult)
                    return right();
                return leftResult;
            case expressions.BinaryOperator.Or:
                if (!leftResult)
                    return right();
                return leftResult;
            case expressions.BinaryOperator.Minus:
                return right().then((right) => leftResult - right);
            case expressions.BinaryOperator.Plus:
                return right().then((right) => leftResult + right);
            case expressions.BinaryOperator.Modulo:
                return right().then((right) => leftResult - right);
            case expressions.BinaryOperator.Div:
                return right().then(right => leftResult / right);
            case expressions.BinaryOperator.Times:
                return right().then(right => leftResult * right);
            case expressions.BinaryOperator.Pow:
                return right().then(right => Math.pow(leftResult, right));
            case expressions.BinaryOperator.Unknown:
                throw new Error(`${operator} is not supported`);
        }
    }
}
