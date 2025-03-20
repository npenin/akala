import { TernaryOperator } from './ternary-operator.js';
import { Expression, Expressions, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a ternary conditional expression using the '? :' syntax.
 * @template T - The type of the expressions involved in the condition.
 */
export class TernaryExpression<T extends Expressions = StrictExpressions> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.TernaryExpression} The expression type constant
     */
    public get type(): ExpressionType.TernaryExpression { return ExpressionType.TernaryExpression; }

    /**
     * The condition expression that determines which branch to take.
     */
    public readonly first: T;

    /**
     * The ternary operator (always '?' in valid expressions).
     */
    public readonly operator: TernaryOperator;

    /**
     * The expression to evaluate if the condition is truthy.
     */
    public readonly second: T;

    /**
     * The expression to evaluate if the condition is falsy.
     */
    public readonly third: T;

    /**
     * Creates a new TernaryExpression instance.
     * @param {T} first - The condition expression
     * @param {TernaryOperator} operator - The '?' operator token
     * @param {T} second - The expression for the truthy case
     * @param {T} third - The expression for the falsy case
     */
    constructor(first: T, operator: TernaryOperator, second: T, third: T)
    {
        super();
        this.first = first;
        this.operator = operator;
        this.second = second;
        this.third = third;
    }

    /**
     * Accepts a visitor for the visitor pattern.
     * @param {ExpressionVisitor} visitor - The visitor to process this node
     * @returns {TernaryExpression<Expressions>} The result of visitor processing
     */
    public accept(visitor: ExpressionVisitor): TernaryExpression<Expressions>
    {
        return visitor.visitTernary(this);
    }
}
