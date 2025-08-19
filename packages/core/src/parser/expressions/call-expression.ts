import { Expression, type TypedExpression, type Expressions, type StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a call expression.
 * @template T
 * @template TMethod
 * @extends {Expression}
 */
export class CallExpression<T, TMethod extends keyof T> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.CallExpression} The type of the expression.
     */
    public get type(): ExpressionType.CallExpression { return ExpressionType.CallExpression; }
    public readonly arguments: Expressions[];

    /**
     * Creates an instance of CallExpression.
     * @param {TypedExpression<T>} source - The source expression.
     * @param {TypedExpression<TMethod>} method - The method expression.
     * @param {StrictExpressions[]} args - The arguments of the call expression.
     */
    constructor(public readonly source: TypedExpression<T>, public readonly method: TypedExpression<TMethod>, args: StrictExpressions[], public readonly optional: boolean)
    {
        super();
        this.arguments = args;
    }

    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor to accept.
     * @returns {any} The result of the visitor's visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitCall(this);
    }
}
