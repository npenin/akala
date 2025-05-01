import { AssignmentOperator } from './assignment-operator.js';
import { Expression, Expressions, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents an assignment expression.
 * @template T - The type of the expressions.
 */
export class AssignmentExpression<T extends Expressions = StrictExpressions> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.AssignmentExpression} The type of the expression.
     */
    public get type(): ExpressionType.AssignmentExpression { return ExpressionType.AssignmentExpression; }

    /**
     * Initializes a new instance of the AssignExpression class.
     * @param {T} left - The left expression.
     * @param {AssignmentOperator} operator - The binary operator.
     * @param {T} right - The right expression.
     */
    constructor(public readonly left: T, public readonly operator: AssignmentOperator, public readonly right: T)
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
        return visitor.visitAssign(this);
    }
}
