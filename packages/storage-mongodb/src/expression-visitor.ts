import { isPromiseLike } from "@akala/core";
import * as expressions from "@akala/core/expressions";
import { ApplySymbolExpression, BinaryExpression, CallExpression, ConstantExpression, Expressions, ExpressionVisitor, LambdaExpression, MemberExpression, NewExpression, ParameterExpression, StrictExpressions, UnaryExpression, UnknownExpression } from "@akala/core/expressions";
import { Exception, ExpressionExecutor, ModelDefinition, NotSupportedException, QuerySymbols, Relationship } from "@akala/storage";
import { Document } from "mongodb";

export default class MongoDbTranslator extends ExpressionVisitor
{
    parameterMap: Map<unknown, unknown>;
    evaluating: string;
    model: ModelDefinition<unknown>;
    result: unknown;
    pipeline: Document;
    pipelines: Document[] = [];

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
            const result = this.result;
            this.visit(m.member);
            const member = this.result as string | number | symbol;
            this.result = result;
            this.visit(m.source);

            result[member] = this.result;
        }

        this.result = result;
        return expression;
    }

    visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>)
    {
        this.visit(arg0.source);
        switch (arg0.symbol)
        {
            case QuerySymbols.any:
                if (arg0.argument)
                {
                    if (arg0.argument)
                        this.visitApplySymbol(new ApplySymbolExpression(null, QuerySymbols.where, arg0.argument));
                }

                this.pipelines.push({ $addFields: { result: true } },
                    { $project: { result: 1, _id: 0 } });
                this.model = null;
                break;
            case QuerySymbols.count:
                if (arg0.argument)
                {
                    if (arg0.argument)
                        this.visitApplySymbol(new ApplySymbolExpression(null, QuerySymbols.where, arg0.argument));
                }

                this.pipelines.push({ $group: { result: { $sum: 1 }, _id: null } }, { $project: { _id: 0 } });
                this.model = null;
                break;
            case QuerySymbols.groupby:
                if (!arg0.argument)
                    throw new Exception('group by is missing the group criteria');

                // this.result = Enumerable.groupByAsync(this.result as AsyncIterable<unknown>, async (value) =>
                // {
                //     this.result = value;
                //     await this.visit(arg0.argument);
                //     return this.result as string | number;
                // });
                if (arg0.argument)
                {
                    if (arg0.argument)
                        this.visitApplySymbol(new ApplySymbolExpression(null, QuerySymbols.where, arg0.argument));
                }

                this.pipelines.push({ $group: { ...this.pipeline, _id: null } });
                this.model = null;
                break;
            case QuerySymbols.select:
                throw new Error('Not supported');
                // if (!arg0.argument)
                //     throw new Exception('select is missing the select criteria');

                // this.result = Enumerable.selectAsync(this.result, async (value) =>
                // {
                //     this.result = value;
                //     await this.visit(arg0.argument);
                //     return this.result;
                // });
                // this.model = null;
                break;
            case QuerySymbols.where:
                {
                    const oldResult = this.result;
                    this.visit(arg0.argument);

                    this.pipelines.push(this.pipeline);
                    this.result = oldResult;

                    // result = [];
                    // if (!arg0.argument)
                    //     throw new Exception('select is missing the select criteria');

                    // this.result = await Enumerable.whereAsync(this.result, async (value) =>
                    // {
                    //     this.result = value;
                    //     if (isPromiseLike(value))
                    //         this.result = await value;
                    //     await this.visit(arg0.argument);
                    //     return this.result as boolean;
                    // });

                    break;
                }
            case QuerySymbols.orderby:
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
    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        throw new NotSupportedException();
        // const source = await this.visit(arg0.source);
        // // const src = this.result;
        // const args = await this.visitArray(arg0.arguments) as StrictExpressions[];
        // if (source !== arg0.source || args !== arg0.arguments)
        // {
        //     if (!this.isTypedExpression(source))
        //         throw new Error('source is of type ' + source['type'] + ' and cannot be considered as a typed expression');
        //     return new CallExpression<T, TMethod>(source, arg0.method, args);
        // }
        // return arg0;
    }

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TS2416
    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>)
    {
        const result = this.result;
        this.visit(arg0.member);
        let member = this.result as string;
        this.result = result;
        this.visit(arg0.source);
        if (this.model)
        {
            member = this.model.members[member].nameInStorage;
            if (member == null)
            {
                member = (this.model.relationships[member] as Relationship<T, TMember>).name.toString();
                this.model = (this.model.relationships[member] as Relationship<T, TMember>).target;
            }
        }

        // if (isPromiseLike(this.evaluating))
        //     this.evaluating = this.evaluating.then(v => `${v}.${member}`);
        // else
        this.evaluating = member;
        this.result = null;

        return arg0;
    }

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        this.result = arg0.value;
        return arg0;
    }
    visitParameter(arg0: ParameterExpression<unknown>)
    {
        if (typeof this.evaluating !== 'undefined')
            this.result = this.evaluating;

        if (this.result instanceof ModelDefinition)
            this.model = this.result;

        return arg0;
    }
    visitUnary(arg0: UnaryExpression)
    {
        const operand = this.visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }

    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>)
    {
        const left = this.visit(expression.left);

        if (isPromiseLike(this.evaluating))
            var leftEvaluating: { $getField: string } = { $getField: this.evaluating };

        else
            var leftEvaluating = { $getField: this.evaluating };

        var leftResult = this.result;

        function buildPipeline(operator: string)
        {
            if (this.result === null)
                if (leftResult === null)
                    return { $match: { $expr: { [operator]: [leftEvaluating, { $getField: this.evaluating }] } } };
                else
                    return { $match: { $expr: { [operator]: [leftResult, { $getField: this.evaluating }] } } };
            else
                if (leftResult === null)
                    return { $match: { $expr: { [operator]: [leftEvaluating, this.result] } } };
                else
                    return null;
        }
        var pipeline: Document;
        switch (expression.operator)
        {
            case expressions.BinaryOperator.Equal:
                this.visit(expression.right);
                pipeline = buildPipeline.call(this, '$eq');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }

                break;
            case expressions.BinaryOperator.NotEqual:
                this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$ne');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.LessThan:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$lt');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.LessThanOrEqual:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$lte');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.GreaterThan:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$gt');
                if (pipeline == null) this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                {
                    if (isPromiseLike(this.result))
                        return this.result as PromiseLike<number>;
                    return {
                        then(x: (right: number) => unknown) { return x(this.result as number) }
                    } as PromiseLike<number>
                }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.GreaterThanOrEqual:
                var right = this.visit(expression.right);


                pipeline = buildPipeline.call(this, '$gte');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.And:
                if (leftResult === null)
                {
                    pipeline = this.pipeline;
                    this.pipeline = null;
                    this.visit(expression.right);
                    if (this.pipeline)
                        this.pipeline = { $and: [this.pipeline.$match, pipeline.$match] }
                }
                else
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                break;
            case expressions.BinaryOperator.Or:
                if (leftResult === null)
                {
                    pipeline = this.pipeline;
                    this.pipeline = null;
                    this.visit(expression.right);
                    if (this.pipeline)
                        this.pipeline = { $or: [this.pipeline.$match, pipeline.$match] }
                }
                else if (!leftResult)
                    this.visit(expression.right);
                break;
            case expressions.BinaryOperator.Minus:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$subtract');

                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Plus:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$add');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Modulo:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$modulo');
                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Div:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$div');

                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Times:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$multiply');

                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Pow:
                var right = this.visit(expression.right);

                pipeline = buildPipeline.call(this, '$pow');

                if (pipeline == null)
                    this.result = ExpressionExecutor.applyBinary(leftResult as number, () =>
                    {
                        if (isPromiseLike(this.result))
                            return this.result as PromiseLike<number>;
                        return {
                            then(x: (right: number) => unknown) { return x(this.result as number) }
                        } as PromiseLike<number>
                    }, expression.operator);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Unknown:
                throw new Error(`${expression.operator} is not supported`);
        }


        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }
}
