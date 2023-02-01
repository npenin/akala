import { Expression, TypedExpression, StrictExpressions, Expressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ExpressionVisitor } from './expression-visitor.js';
import { IVisitable } from './visitable.js';

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export class ApplySymbolExpression<T, U> extends Expression implements IVisitable<ExpressionVisitor, Promise<Expressions>>
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