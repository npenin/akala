import { Expression } from './expression';
import { ExpressionType } from './expression-type';
import { ExpressionVisitor } from './expression-visitor';

export class ConstantExpression<T> extends Expression
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