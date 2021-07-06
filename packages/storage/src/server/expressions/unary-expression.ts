import { Expression, Expressions } from './expression';
import { ExpressionType } from './expression-type';
import { UnaryOperator } from './unary-operator';
import { ExpressionVisitor } from './expression-visitor';

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