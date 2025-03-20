import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a function parameter in an expression.
 * @template T - The type of the parameter value.
 */
export class ParameterExpression<T> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.ParameterExpression} The expression type constant
     */
    public get type(): ExpressionType.ParameterExpression { return ExpressionType.ParameterExpression; }

    /**
     * The name/identifier of the parameter.
     */
    public readonly name: string;

    /**
     * Creates a new ParameterExpression instance.
     * @param {string} [name=''] - The parameter's identifier name
     */
    constructor(name: string = '')
    {
        super();
        this.name = name;
    }

    /**
     * Accepts a visitor for the visitor pattern.
     * @param {ExpressionVisitor} visitor - The visitor to process this node
     * @returns {*} The result of the visitor's processing
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitParameter(this);
    }
}
