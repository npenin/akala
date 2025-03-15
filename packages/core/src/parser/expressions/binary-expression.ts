import { BinaryOperator } from './binary-operator.js';
import { Expression, Expressions, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a binary expression.
 * @template T - The type of the expressions.
 */
export class BinaryExpression<T extends Expressions = StrictExpressions> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.BinaryExpression} The type of the expression.
     */
    public get type(): ExpressionType.BinaryExpression { return ExpressionType.BinaryExpression; }

    /**
     * Initializes a new instance of the BinaryExpression class.
     * @param {T} left - The left expression.
     * @param {BinaryOperator} operator - The binary operator.
     * @param {T} right - The right expression.
     */
    constructor(public readonly left: T, public readonly operator: BinaryOperator, public readonly right: T)
    {
        super();
    }

    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor.
     * @returns {any} The result of the visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitBinary(this);
    }
}
