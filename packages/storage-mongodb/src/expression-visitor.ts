import { expressions, isPromiseLike } from "@akala/core";
import { ApplySymbolExpression, BinaryExpression, CallExpression, ConstantExpression, EqualityComparer, Expressions, ExpressionType, ExpressionVisitor, IEnumerable, LambdaExpression, MemberExpression, NewExpression, ParameterExpression, StrictExpressions, TypedExpression, TypedLambdaExpression, UnaryExpression, UnknownExpression } from "@akala/core/expressions";
import { Enumerable, Exception, ModelDefinition, NotSupportedException, QuerySymbols } from "@akala/storage";
import { AggregationCursor, Collection, Db, Document, FindCursor } from "mongodb";

export default class MongoDbTranslator extends ExpressionVisitor
{
    parameterMap: Map<unknown, unknown>;
    evaluating: string;
    model: ModelDefinition<unknown>;
    result: unknown;
    pipeline: Document;
    pipelines: Document[] = [];

    constructor(private db: Db)
    {
        super();
    }

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this);
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
                this.result = (this.result as Collection).estimatedDocumentCount()
                this.model = null;
                break;
            case QuerySymbols.count:
                if (arg0.argument)
                {
                    result = [];
                    if (arg0.argument)
                        await this.visitApplySymbol(new ApplySymbolExpression(null, QuerySymbols.where, arg0.argument));
                }

                this.pipelines.push({ $count: 'result' });
                this.model = null;
                break;
            case QuerySymbols.groupby:
                throw new Error('Not supported');
                // result = this.result as unknown[];
                // if (!arg0.argument)
                //     throw new Exception('group by is missing the group criteria');

                // this.result = Enumerable.groupByAsync(this.result as AsyncIterable<unknown>, async (value) =>
                // {
                //     this.result = value;
                //     await this.visit(arg0.argument);
                //     return this.result as string | number;
                // });
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
                this.model = null;
                break;
            case QuerySymbols.where:
                const oldResult = this.result;
                await this.visit(arg0.argument);

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
        throw new NotSupportedException();
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

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    //@ts-ignore TS2416
    async visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>)
    {
        await this.visit(arg0.source);
        if (isPromiseLike(this.evaluating))
            this.evaluating = await this.evaluating.then(v => `${this.evaluating}.${arg0.member.toString()}`);
        else
            this.evaluating = arg0.member.toString();
        this.result = null;

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

        if (isPromiseLike(this.evaluating))
            var leftEvaluating: { $getField: string } = { $getField: await this.evaluating };

        else
            var leftEvaluating = { $getField: this.evaluating };

        if (isPromiseLike(this.result))
            var leftResult = await this.result;

        else
            var leftResult = this.result;

        async function buildPipeline(operator: string)
        {
            if (this.result === null)
                if (leftResult === null)
                    if (isPromiseLike(this.evaluating))
                        return { $match: { $expr: { [operator]: [leftEvaluating, { $getField: await this.evaluating }] } } };
                    else
                        return { $match: { $expr: { [operator]: [leftEvaluating, { $getField: this.evaluating }] } } };
                else
                    if (isPromiseLike(this.evaluating))
                        return { $match: { $expr: { [operator]: [leftResult, { $getField: await this.evaluating }] } } };
                    else
                        return { $match: { $expr: { [operator]: [leftResult, { $getField: this.evaluating }] } } };
            else
                if (leftResult === null)
                    if (isPromiseLike(this.evaluating))
                        return { $match: { $expr: { [operator]: [leftEvaluating, await this.result] } } };
                    else
                        return { $match: { $expr: { [operator]: [leftEvaluating, this.result] } } };
                else
                    return null;
        }
        var pipeline: Document;
        switch (expression.operator)
        {
            case expressions.BinaryOperator.Equal:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                pipeline = await buildPipeline.call(this, '$eq');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult === await this.result;
                    else
                        this.result = leftResult === this.result;
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }

                break;
            case expressions.BinaryOperator.NotEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$ne');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult !== await this.result;
                    else
                        this.result = leftResult !== this.result;
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.LessThan:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$lt');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult > await this.result;
                    else
                        this.result = leftResult > this.result;
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.LessThanOrEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$lte');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult <= await this.result;
                    else
                        this.result = leftResult <= this.result;
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.GreaterThan:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$gt');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult > await this.result;
                    else
                        this.result = leftResult > this.result;
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.GreaterThanOrEqual:
                var right = await (this as ExpressionVisitor).visit(expression.right);


                pipeline = await buildPipeline.call(this, '$gte');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult >= await this.result;
                    else
                        this.result = leftResult >= this.result;
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
                    await (this as ExpressionVisitor).visit(expression.right);
                    if (this.pipeline)
                        this.pipeline = { $and: [this.pipeline.$match, pipeline.$match] }
                }
                else if (leftResult)
                    await (this as ExpressionVisitor).visit(expression.right);
                break;
            case expressions.BinaryOperator.Or:
                if (leftResult === null)
                {
                    pipeline = this.pipeline;
                    this.pipeline = null;
                    await (this as ExpressionVisitor).visit(expression.right);
                    if (this.pipeline)
                        this.pipeline = { $or: [this.pipeline.$match, pipeline.$match] }
                }
                else if (!leftResult)
                    await (this as ExpressionVisitor).visit(expression.right);
                break;
            case expressions.BinaryOperator.Minus:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$subtract');

                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number - (await this.result as number);
                    else
                        this.result = leftResult as number - (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Plus:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$add');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number - (await this.result as number);
                    else
                        this.result = leftResult as number - (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Modulo:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$modulo');
                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number % (await this.result as number);
                    else
                        this.result = leftResult as number % (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Div:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$div');

                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number / (await this.result as number);
                    else
                        this.result = leftResult as number / (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Times:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$multiply');

                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number * (await this.result as number);
                    else
                        this.result = leftResult as number * (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
                break;
            case expressions.BinaryOperator.Pow:
                var right = await (this as ExpressionVisitor).visit(expression.right);

                pipeline = await buildPipeline.call(this, '$pow');

                if (pipeline == null)
                    if (isPromiseLike(this.result))
                        this.result = leftResult as number * (await this.result as number);
                    else
                        this.result = leftResult as number * (this.result as number);
                else
                {
                    this.pipeline = pipeline;
                    this.result = null;
                }
            case expressions.BinaryOperator.Unknown:
                throw new Error(`${expression.operator} is not supported`);
        }


        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }
}
