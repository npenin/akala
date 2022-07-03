// /* eslint-disable @typescript-eslint/no-explicit-any */

import { Expressions, StrictExpressions, TypedExpression, IEnumerable, UnknownExpression } from './expressions/expression';
import { ExpressionVisitor, EqualityComparer } from './expressions/expression-visitor';
import { ExpressionType } from './expressions/expression-type';
import { NewExpression } from './expressions/new-expression';
import { ApplySymbolExpression } from './expressions/apply-symbol-expression';
import { CallExpression } from './expressions/call-expression';
import { MemberExpression } from './expressions/member-expression';
import { TypedLambdaExpression, Parameters, LambdaExpression } from './expressions/lambda-expression';
import { ConstantExpression } from './expressions/constant-expression';
import { ParameterExpression } from './expressions/parameter-expression';
import { UnaryExpression } from './expressions/unary-expression';
import { BinaryExpression } from './expressions/binary-expression';
import { QuerySymbols } from './Query';
import { Exception } from './exceptions';
import { ModelDefinition } from './shared';
import * as  Enumerable from './Enumerable';
import { BinaryOperator, isPromiseLike } from "@akala/core";

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
            return expression.accept(this as ExpressionVisitor);
        throw new Error("unsupported type");
    }

    async visitNew<T>(expression: NewExpression<T>)
    {

        const result = {};

        for (const m of expression.init)
        {
            await this.visit(m.source);
            result[m.member] = this.result;
        }

        this.result = result;
        return expression;
    }

    async visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>)
    {
        let result: Iterable<unknown> | AsyncIterable<unknown>;
        await this.visit(arg0.source);
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
                        result = Enumerable.whereAsync(this.result as Result, async (value) =>
                        {
                            this.result = value;
                            await this.visit(arg0.argument);
                            return this.result as boolean;
                        });
                    }
                }

                this.result = await Enumerable.lengthAsync(result);
                this.model = null;
                break;
            case QuerySymbols.groupby:
                result = this.result as unknown[];
                if (!arg0.argument)
                    throw new Exception('group by is missing the group criteria');

                this.result = Enumerable.groupByAsync(this.result as AsyncIterable<unknown>, async (value) =>
                {
                    this.result = value;
                    await this.visit(arg0.argument);
                    return this.result as string | number;
                });
                this.model = null;
                break;
            case QuerySymbols.select:
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = Enumerable.selectAsync(this.result as Result, async (value) =>
                {
                    this.result = value;
                    await this.visit(arg0.argument);
                    return this.result;
                });
                this.model = null;
                break;
            case QuerySymbols.where:
                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = await Enumerable.whereAsync(this.result as Result, async (value) =>
                {
                    this.result = value;
                    if (isPromiseLike(value))
                        this.result = await value;
                    await this.visit(arg0.argument);
                    return this.result as boolean;
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
    async visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>)
    {
        const source = await this.visit(arg0.source);
        // const src = this.result;
        const args = await (this as ExpressionVisitor).visitArray(arg0.arguments) as StrictExpressions[];
        if (source !== arg0.source || args !== arg0.arguments)
        {
            if (!this.isTypedExpression(source))
                throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
            return new CallExpression<T, TMethod>(source, arg0.method, args);
        }
        return arg0;
    }


    async visitEnumerable<T>(map: IEnumerable<T>, addToNew: (item: T) => void, visitSingle: (item: T) => PromiseLike<T>, compare?: EqualityComparer<T>): Promise<void>
    {
        const result = [];
        super.visitEnumerable(map, addToNew, async (t) =>
        {
            const x = await visitSingle.call(this, t);
            result.push(this.result);
            return x;
        }, compare);
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TS2416
    async visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>)
    {
        await this.visit(arg0.source);
        if (isPromiseLike(this.result))
            this.result = await this.result.then(v => v[arg0.member]);
        else if (this.result !== null && this.result !== 'undefined')
            this.result = this.result[arg0.member];
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
    async visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>)
    {
        const parameters = await this.visitArray(arg0.parameters) as Parameters<T>;
        const wasEvaluating = this.evaluating;
        this.evaluating = this.result;
        const body = await (this as ExpressionVisitor).visit(arg0.body);
        this.evaluating = wasEvaluating;
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, arg0.parameters);
        return arg0;
    }

    async visitConstant(arg0: ConstantExpression<unknown>)
    {
        this.result = arg0.value;
        return arg0;
    }
    async visitParameter(arg0: ParameterExpression<unknown>)
    {
        if (typeof this.evaluating !== 'undefined')
            this.result = this.evaluating;
        return arg0;
    }
    async visitUnary(arg0: UnaryExpression)
    {
        const operand = await (this as ExpressionVisitor).visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }
    async visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>)
    {
        const left = await (this as ExpressionVisitor).visit(expression.left);
        if (isPromiseLike(this.result))
            var leftResult = await this.result as number;

        else
            var leftResult = this.result as number;

        switch (expression.operator)
        {
            case BinaryOperator.Equal:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                if (isPromiseLike(this.result))
                    this.result = leftResult === await this.result;

                else
                    this.result = leftResult === this.result;
                break;
            case BinaryOperator.NotEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult !== this.result;
                break;
            case BinaryOperator.LessThan:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult < this.result;
                break;
            case BinaryOperator.LessThanOrEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult <= this.result;
                break;
            case BinaryOperator.GreaterThan:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult > this.result;
                break;
            case BinaryOperator.GreaterThanOrEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult >= this.result;
                break;
            case BinaryOperator.And:
                if (leftResult)
                    await (this as ExpressionVisitor).visit(expression.right);
                break;
            case BinaryOperator.Or:
                if (!leftResult)
                    await (this as ExpressionVisitor).visit(expression.right);
                break;
            case BinaryOperator.Minus:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult - (this.result as number);
                break;
            case BinaryOperator.Plus:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult + (this.result as number);
                break;
            case BinaryOperator.Modulo:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult % (this.result as number);
                break;
            case BinaryOperator.Div:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult / (this.result as number);
                break;
            case BinaryOperator.Times:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult * (this.result as number);
                break;
            case BinaryOperator.Pow:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = Math.pow(leftResult, this.result as number);
                break;
            case BinaryOperator.Unknown:
                throw new Error(`${expression.operator} is not supported`);
        }


        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }
}
