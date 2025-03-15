import { Expression, TypedExpression } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import { IVisitable } from './visitable.js';

/**
 * Represents a member expression.
 * @template T - The type of the source expression.
 * @template TMember - The type of the member expression.
 * @template U - The type of the member value.
 */
export class MemberExpression<T, TMember extends keyof T, U extends T[TMember]> extends Expression
    implements IVisitable<ExpressionVisitor, TypedExpression<U>>
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.MemberExpression} The type of the expression.
     */
    public get type(): ExpressionType.MemberExpression { return ExpressionType.MemberExpression; }
    public $$length: number;

    /**
     * Initializes a new instance of the MemberExpression class.
     * @param {TypedExpression<T>} source - The source expression.
     * @param {TypedExpression<TMember>} member - The member expression.
     * @param {boolean} optional - Indicates whether the member is optional.
     */
    constructor(public readonly source: TypedExpression<T>, public readonly member: TypedExpression<TMember>, public optional: boolean)
    {
        super();
    }

    /**
     * Accepts a visitor.
     * @param {ExpressionVisitor} visitor - The visitor to accept.
     * @returns {TypedExpression<U>} The result of the visit.
     */
    public accept(visitor: ExpressionVisitor): TypedExpression<U>
    {
        return visitor.visitMember(this) as TypedExpression<U>;
    }
}
