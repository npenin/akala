import { Expression, TypedExpression, StrictExpressions, } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import { IVisitable } from './visitable.js';

//eslint-disable-next-line @typescript-eslint/no-unused-vars
/**
 * Represents an expression that applies a symbol to a source expression and an optional argument.
 * @template T - The type of the source expression.
 * @template U - The type of the result of the expression.
 * @extends {Expression}
 * @implements {IVisitable<ExpressionVisitor, StrictExpressions>}
 */
export class ApplySymbolExpression<T, U> extends Expression implements IVisitable<ExpressionVisitor, StrictExpressions>
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.ApplySymbolExpression} The type of the expression.
     */
    public get type(): ExpressionType.ApplySymbolExpression { return ExpressionType.ApplySymbolExpression; }

    /**
     * Initializes a new instance of the ApplySymbolExpression class.
     * @param {TypedExpression<T>} source - The source expression.
     * @param {symbol} symbol - The symbol to apply.
     * @param {StrictExpressions} [argument] - The optional argument.
     */
    constructor(public readonly source: TypedExpression<T>, public readonly symbol: symbol, public readonly argument?: StrictExpressions)
    {
        super();
    }

    /**
     * Accepts a visitor to visit this expression.
     * @param {ExpressionVisitor} visitor - The visitor to accept.
     * @returns {any} The result of the visitor's visit.
     */
    public accept(visitor: ExpressionVisitor)
    {
        return visitor.visitApplySymbol(this);
    }
}
