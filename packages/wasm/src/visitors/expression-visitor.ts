import { BinaryExpression, BinaryOperator, Expressions, ExpressionVisitor, StrictExpressions } from "@akala/core/expressions";
import { i32 } from "../helpers/i32.js";
import { f32 } from "../helpers/f32.js";
import { i64 } from "../helpers/i64.js";
import { f64 } from "../helpers/f64.js";

export class WasmTranslator<TNative extends number | bigint> extends ExpressionVisitor
{
    private opcodes: TNative[];
    private lastEval: i32 | f32 | i64 | f64;

    public translate(e: Expressions): TNative[]
    {
        this.visit(e);
        return this.opcodes;
    }

    public visitBinary<T extends Expressions = StrictExpressions>(expression: BinaryExpression<T>): BinaryExpression<Expressions>
    {
        this.visit(expression.left);
        const left = this.lastEval;
        this.lastEval = null;

        this.visit(expression.right);
        const right = this.lastEval;

        switch (expression.operator)
        {
            case BinaryOperator.Equal:
            case BinaryOperator.StrictEqual:
                this.lastEval = left.eq(right as any);
            case BinaryOperator.NotEqual:
            case BinaryOperator.StrictNotEqual:
                this.lastEval = left.ne(right as any);
            case BinaryOperator.LessThan:
            case BinaryOperator.LessThanOrEqual:
            case BinaryOperator.GreaterThan:
            case BinaryOperator.GreaterThanOrEqual:
            case BinaryOperator.And:
            case BinaryOperator.Or:
            case BinaryOperator.Minus:
            case BinaryOperator.Plus:
            case BinaryOperator.Modulo:
            case BinaryOperator.Div:
            case BinaryOperator.Times:
            case BinaryOperator.Pow:
            case BinaryOperator.Dot:
            case BinaryOperator.QuestionDot:
            case BinaryOperator.Format:
            case BinaryOperator.Unknown:
        }

        return expression;
    }
}
