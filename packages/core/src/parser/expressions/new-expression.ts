/* eslint-disable @typescript-eslint/no-explicit-any */

import { Expression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import { MemberExpression } from './member-expression.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';

/**
 * Represents a 'new' expression used to instantiate objects or create array literals.
 * @template T - The type of the instantiated object.
 */
export class NewExpression<T> extends Expression
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.NewExpression} The expression type constant
     */
    public get type(): ExpressionType.NewExpression { return ExpressionType.NewExpression; }

    /**
     * Array of initialization expressions for the new instance.
     */
    public readonly init: MemberExpression<T, any, any>[];

    /**
     * Indicates the type of initialization:
     * - '{' for object literals
     * - '[' for array literals
     */
    public newType: '{' | '[' = '{';

    /**
     * Creates a new NewExpression instance.
     * @param {...MemberExpression<T, any, any>} init - The initialization expressions for the new instance
     */
    constructor(...init: MemberExpression<T, any, any>[])
    {
        super();
        this.init = init;
    }

    /**
     * Accepts a visitor for the visitor pattern.
     * @param {ExpressionVisitor} visitor - The visitor to process this node
     * @returns {*} The result of the visitor's processing
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitNew(this);
    }
}
