import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a constant expression.
 * @template T - The type of the constant value.
 */
export class ConstantExpression<const T> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.ConstantExpression} The type of the expression.
     */
    public get type(): ExpressionType.ConstantExpression { return ExpressionType.ConstantExpression; }

    /**
     * Initializes a new instance of the ConstantExpression class.
     * @param {T} value - The constant value.
     */
    constructor(public readonly value: T)
    {
        super();
    }

    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor to accept.
     * @returns {any} The result of the visitor's visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitConstant(this);
    }
}
