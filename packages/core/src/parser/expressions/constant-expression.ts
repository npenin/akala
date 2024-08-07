import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

export class ConstantExpression<const T> extends Expression
{
    public get type(): ExpressionType.ConstantExpression { return ExpressionType.ConstantExpression; }
    constructor(public readonly value: T)
    {
        super();
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitConstant(this);
    }
}