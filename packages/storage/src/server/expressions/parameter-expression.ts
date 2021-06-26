import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { ExpressionVisitor } from './expression-visitor.js';

export class ParameterExpression<T> extends Expression
{
    public get type(): ExpressionType.ParameterExpression { return ExpressionType.ParameterExpression; }
    constructor(public readonly name: string = '')
    {
        super();
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitParameter(this);
    }
}