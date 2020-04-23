import { PersistenceEngine, dynamicProxy } from "../PersistenceEngine";
import { Expressions, StrictExpressions, TypedExpression, IEnumerable, UnknownExpression } from "../expressions/expression";
import { ExpressionVisitor, EqualityComparer } from "../expressions/expression-visitor";
import { ExpressionType } from "../expressions/expression-type";
import { NewExpression } from "../expressions/new-expression";
import { ApplySymbolExpression } from "../expressions/apply-symbol-expression";
import { CallExpression } from "../expressions/call-expression";
import { MemberExpression } from "../expressions/member-expression";
import { TypedLambdaExpression, Parameter, LambdaExpression } from "../expressions/lambda-expression";
import { ConstantExpression } from "../expressions/constant-expression";
import { ParameterExpression } from "../expressions/parameter-expression";
import { UnaryExpression } from "../expressions/unary-expression";
import { BinaryExpression } from "../expressions/binary-expression";
import { QuerySymbols } from "../Query";
import { Exception, NotSupportedException } from "../exceptions";
import { Enumerable, ModelDefinition } from "../shared";
import { isPromiseLike } from "@akala/core";
import { BinaryOperator } from "../expressions/binary-operator";
import { CommandProcessor } from "../commands/command-processor";
import { Commands, CommandResult } from "../commands/command";

export class Vanilla extends PersistenceEngine<any>
{
    constructor()
    {
        super(new VanillaCommandProcessor())
    }
    store: any;
    public async init(options?: VanillaOptions): Promise<void>
    {
        if (!options)
            options = {};
        if (!options.store)
            options.store = {};
        this.store = options.store;
        this.processor.init(options);
    }
    public async load<T>(expression: StrictExpressions): Promise<T>
    {
        var executor = new ExpressionExecutor();
        executor.result = store;
        await executor.visit(expression);
        if (executor.model)
            if (Array.isArray(executor.result))
                return this.dynamicProxy(executor.result, executor.model) as any;
            else
                return dynamicProxy<T>(executor.result, executor.model);
        else
            return executor.result;
    }
}

interface VanillaStore
{ [key: string]: any[] }

export interface VanillaOptions
{
    store?: VanillaStore;
}

export class VanillaCommandProcessor extends CommandProcessor<VanillaOptions>
{
    private store: VanillaStore;
    private engineOptions: VanillaOptions;

    constructor()
    {
        super();
    }

    visitUpdate<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        throw new Error("Method not implemented.");
    }

    visitDelete<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        throw new Error("Method not implemented.");
    }
    visitInsert<T>(cmd: Commands<T>): PromiseLike<CommandResult>
    {
        throw new Error("Method not implemented.");
    }
    init(options: VanillaOptions): void
    {
        this.store = options.store;
        this.engineOptions = options;
    }


}

export class ExpressionExecutor extends ExpressionVisitor
{
    parameterMap: Map<any, any>;
    evaluating: any;
    model: ModelDefinition<any>;

    constructor()
    {
        super();
    }

    result: any;

    visitUnknown(expression: UnknownExpression)
    {
        if (expression.accept)
            return expression.accept(this as ExpressionVisitor);
        throw new Error("unsupported type");
    }

    async visitNew<T>(expression: NewExpression<T>)
    {

        var result = {};

        for (var m of expression.init)
        {
            this.visit(m);
            result[m.member] = result;
        }

        this.result = result;
        return expression;
    }

    async visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>)
    {
        let result;
        await this.visit(arg0.source);
        switch (arg0.symbol)
        {
            case QuerySymbols.any:
            case QuerySymbols.count:
                result = this.result;
                if (arg0.argument)
                {
                    result = [];
                    if (arg0.argument)
                    {
                        result = Enumerable.whereAsync(this.result, async (value) =>
                        {
                            this.result = value;
                            await this.visit(arg0.argument);
                            return this.result;
                        });
                    }
                }

                this.result = await Enumerable.lengthAsync(result);
                break;
            case QuerySymbols.groupby:
                result = this.result;
                if (!arg0.argument)
                    throw new Exception('group by is missing the group criteria');

                this.result = Enumerable.groupBy(this.result, function (value)
                {
                    this.result = value;
                    this.visit(arg0.argument);
                    return this.result;
                })
                this.model = null
                break;
            case QuerySymbols.select:
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = Enumerable.select(this.result, (value) =>
                {
                    this.result = value;
                    this.visit(arg0.argument);
                    return this.result;
                });
                this.model = null;
                break;
            case QuerySymbols.where:
                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = await Enumerable.whereAsync(this.result, async (value) =>
                {
                    this.result = value;
                    if (isPromiseLike(value))
                        this.result = await value;
                    await this.visit(arg0.argument);
                    return this.result;
                });

                break;
            case QuerySymbols.orderby:

                result = [];
                if (!arg0.argument)
                    throw new Exception('select is missing the select criteria');

                this.result = (this.result as any[]).sort((a, b) =>
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

                this.result = (this.result as any[]).sort((a, b) =>
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
                binary.left
                break;
        }

        return arg0;
    }

    //@ts-ignore TS2416
    async visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>)
    {
        var source = await this.visit(arg0.source);
        var src = this.result;
        var args = await (this as ExpressionVisitor).visitArray(arg0.arguments) as StrictExpressions[];
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
        var result = [];
        super.visitEnumerable(map, addToNew, async (t) =>
        {
            var x = await visitSingle.call(this, t);
            result.push(this.result);
            return x;
        }, compare);
    }

    //@ts-ignore TS2416
    async visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>)
    {
        await this.visit(arg0.source);
        if (isPromiseLike(this.result))
            this.result = await this.result.then(v => v[arg0.member]);
        else
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
    async visitLambda<T extends (...args: any[]) => any>(arg0: TypedLambdaExpression<T>)
    {
        var parameters: Parameter<T> = await this.visitArray(arg0.parameters) as any;
        var wasEvaluating = this.evaluating;
        this.evaluating = this.result;
        var body = await (this as ExpressionVisitor).visit(arg0.body);
        this.evaluating = wasEvaluating;
        if (body !== arg0.body || parameters !== arg0.parameters)
            return new TypedLambdaExpression<T>(body, arg0.parameters);
        return arg0;
    }

    async visitConstant(arg0: ConstantExpression<any>)
    {
        this.result = arg0.value;
        return arg0;
    }
    async visitParameter(arg0: ParameterExpression<any>)
    {
        if (typeof this.evaluating !== 'undefined')
            this.result = this.evaluating;
        return arg0;
    }
    async visitUnary(arg0: UnaryExpression)
    {
        var operand = await (this as ExpressionVisitor).visit(arg0.operand);
        if (operand !== arg0.operand)
            return new UnaryExpression(operand, arg0.operator);
        return arg0;
    }
    async visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>)
    {
        var left = await (this as ExpressionVisitor).visit(expression.left);
        if (isPromiseLike(this.result))
            var leftResult = await this.result;
        else
            var leftResult = this.result;

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
                this.result = leftResult - this.result;
                break;
            case BinaryOperator.Plus:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult + this.result;
                break;
            case BinaryOperator.Modulo:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult % this.result;
                break;
            case BinaryOperator.Div:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult / this.result;
                break;
            case BinaryOperator.Times:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = leftResult * this.result;
                break;
            case BinaryOperator.Pow:
                var right = await (this as ExpressionVisitor).visit(expression.right);
                this.result = Math.pow(leftResult, this.result);
                break;
            case BinaryOperator.Unknown:
                throw new Error(`${expression.operator} is not supported`);
        }


        if (left !== expression.left || right !== expression.right)
            return new BinaryExpression<Expressions>(left, expression.operator, right);
        return expression;
    }
}

var store: { [key: string]: any[] };