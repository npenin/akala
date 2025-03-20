import { Expression, Expressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { UnaryOperator } from './unary-operator.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a unary expression which applies an operator to a single operand.
 */
export class UnaryExpression extends Expression
{
    /**
     * Gets the type identifier for this expression.
     * @returns {ExpressionType.UnaryExpression} The expression type constant
     */
    public get type(): ExpressionType.UnaryExpression { return ExpressionType.UnaryExpression; }

    /**
     * Creates a new unary expression.
     * @param {Expressions} operand - The operand value to which the operator is applied.
     * @param {UnaryOperator} operator - The unary operator being applied (e.g., '+', '-', '!')
     */
    constructor(
        public readonly operand: Expressions,
        public readonly operator: UnaryOperator
    )
    {
        super();
    }

    /**
     * Accepts a visitor to perform visitor pattern operations.
     * @param {ExpressionVisitor} visitor - The visitor instance.
     * @returns {any} The result from the visitor's visitUnary method.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitUnary(this);
    }
}
