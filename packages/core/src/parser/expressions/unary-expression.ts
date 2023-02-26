import { Expression, Expressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { UnaryOperator } from './unary-operator.js';
import { ExpressionVisitor } from './expression-visitor.js';

export class UnaryExpression extends Expression
{
    public get type(): ExpressionType.UnaryExpression { return ExpressionType.UnaryExpression; }
    constructor(public readonly operand: Expressions, public readonly operator: UnaryOperator)
    {
        super();
    }
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitUnary(this);
    }
}