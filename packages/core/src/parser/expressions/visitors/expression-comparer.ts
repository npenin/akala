import ErrorWithStatus from "../../../errorWithStatus.js";
import { FormatExpression } from "../../parser.js";
import { ApplySymbolExpression } from "../apply-symbol-expression.js";
import { BinaryExpression } from "../binary-expression.js";
import { CallExpression } from "../call-expression.js";
import { ConstantExpression } from "../constant-expression.js";
import { Expressions, StrictExpressions } from "../expression.js";
import { TypedLambdaExpression } from "../lambda-expression.js";
import { MemberExpression } from "../member-expression.js";
import { NewExpression } from "../new-expression.js";
import { ParameterExpression } from "../parameter-expression.js";
import { TernaryExpression } from "../ternary-expression.js";
import { UnaryExpression } from "../unary-expression.js";
import { ExpressionVisitor } from "./expression-visitor.js";


/**
 * Compares two expressions.
 * @param {any} expr1 - The first expression.
 * @param {any} expr2 - The second expression.
 * @returns {boolean} True if the expressions are equal, false otherwise.
 */
export class ExpressionComparer extends ExpressionVisitor
{
    constructor(private source: Expressions)
    {
        super();
    }

    public static equals(exp1: Expressions, exp2: Expressions): boolean
    {
        if (exp1.type != exp2.type)
        {
            debugger;
            return false;
        }
        try
        {
            new ExpressionComparer(exp1).visit(exp2);
        }
        catch (e)
        {
            if (e.statusCode == 400)
                return false;
            throw e;
        }
        return true;
    }

    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): StrictExpressions
    {
        if (this.source.type != arg0.type)
            throw new ErrorWithStatus(400);

        const exp1 = this.source;

        if (arg0.source)
        {
            this.source = arg0.source;
            this.visit(arg0.source);
        }
        else if (this.source.source)
            throw new ErrorWithStatus(400);

        this.source = exp1.member;
        this.visit(arg0.member);

        return arg0;
    }

    visitApplySymbol<T, U>(arg0: ApplySymbolExpression<T, U>): StrictExpressions
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        this.source = exp.source;

        this.visit(arg0.source);
        this.source = exp.argument;
        this.visit(arg0.argument);
        return arg0;
    }

    visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): BinaryExpression<Expressions>
    {
        const exp = this.source;
        if (exp.type != expression.type)
            throw new ErrorWithStatus(400);

        this.source = exp.left;
        this.visit(expression.left);

        this.source = exp.right;
        this.visit(expression.right);

        return expression;
    }

    visitCall<T, TMethod extends keyof T>(arg0: CallExpression<T, TMethod>): StrictExpressions
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        this.source = exp.source;
        this.visit(arg0.source);
        if (arg0.arguments.length != exp.arguments.length)
            throw new ErrorWithStatus(400);

        this.visitArray(arg0.arguments as StrictExpressions[], (_, i) => this.source = exp.arguments[i]);
        return arg0;

    }

    visitConstant(arg0: ConstantExpression<unknown>): StrictExpressions
    {
        if (this.source.type != arg0.type)
            throw new ErrorWithStatus(400);

        if (arg0.value != this.source.value)
            throw new ErrorWithStatus(400);

        return arg0;
    }

    visitFormat<TOutput>(expression: FormatExpression<TOutput>): FormatExpression<TOutput>
    {
        const exp = this.source;
        if (exp.type != expression.type)
            throw new ErrorWithStatus(400);

        if (exp.formatter != expression.formatter)
            throw new ErrorWithStatus(400);

        this.source = exp.lhs;
        this.visit(expression.lhs);
        this.source = exp.settings;
        if (expression.settings)
            this.visit(expression.settings);
        else if (this.source)
            throw new ErrorWithStatus(400);

        return expression;
    }

    visitLambda<T extends (...args: unknown[]) => unknown>(arg0: TypedLambdaExpression<T>): StrictExpressions
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        if (arg0.parameters.length != exp.parameters.length)
            throw new ErrorWithStatus(400);

        this.visitArray(arg0.parameters as Expressions[], (e, i) => this.source = exp.parameters[i]);
        this.source = exp.body;
        this.visit(arg0.body);

        return arg0;
    }

    visitNew<T>(arg0: NewExpression<T>): StrictExpressions
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        this.visitArray(arg0.init as Expressions[], (e, i) => this.source = exp.init[i]);

        return arg0;
    }

    visitParameter(arg0: ParameterExpression<unknown>): StrictExpressions
    {
        if (this.source.type != arg0.type)
            throw new ErrorWithStatus(400);

        if (arg0.name != this.source.name)
            throw new ErrorWithStatus(400);

        return arg0;
    }

    visitTernary<T extends Expressions = StrictExpressions>(arg0: TernaryExpression<T>): TernaryExpression<Expressions>
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        this.source = exp.first;
        this.visit(arg0.first);
        this.source = exp.second;
        this.visit(arg0.second);
        this.source = exp.third;
        this.visit(arg0.third);

        return super.visitTernary(arg0);
    }

    visitUnary(arg0: UnaryExpression): Expressions
    {
        const exp = this.source;
        if (exp.type != arg0.type)
            throw new ErrorWithStatus(400);

        if (exp.operator != arg0.operator)
            throw new ErrorWithStatus(400);

        this.source = exp.operand;
        this.visit(arg0.operand);

        return arg0;
    }
}
