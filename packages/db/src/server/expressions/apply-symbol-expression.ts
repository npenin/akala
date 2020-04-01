import { Expression, TypedExpression, StrictExpressions } from "./expression";
import { ExpressionType } from "./expression-type";
import { ExpressionVisitor } from "./expression-visitor";

export class ApplySymbolExpression<T, U> extends Expression
{
    public get type(): ExpressionType.ApplySymbolExpression { return ExpressionType.ApplySymbolExpression; }
    constructor(public readonly source: TypedExpression<T>, public readonly symbol: symbol, public readonly argument?: StrictExpressions)
    {
        super();
    }

    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitApplySymbol(this);
    }
}