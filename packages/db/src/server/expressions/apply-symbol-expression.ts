import { Expression, TypedExpression, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ExpressionVisitor } from './expression-visitor.js';

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