import { Expression, Expressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { UnaryOperator } from './unary-operator.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a unary expression.
 * @param {UnaryOperator} operator - The operator of the unary expression.
 * @param {Expressions} operand - The operand of the unary expression.
 */
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
