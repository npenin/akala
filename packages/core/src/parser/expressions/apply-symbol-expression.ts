import { Expression, TypedExpression, StrictExpressions } from './expression.js';
import { ExpressionType } from './expression-type.js';
import type { ExpressionVisitor } from './visitors/expression-visitor.js';
import { IVisitable } from './visitable.js';

/**
 * Represents an expression that applies a symbol (property/method) to a source expression with an optional argument.
 * @template T - The type of the source expression's result value
 * @template U - The resulting type after applying the symbol
 * @implements {IVisitable<ExpressionVisitor, StrictExpressions>}
 */
export class ApplySymbolExpression<T, U> extends Expression implements IVisitable<ExpressionVisitor, StrictExpressions>
{
    /**
     * Gets the type of the expression.
     * @returns {ExpressionType.ApplySymbolExpression} The expression type constant
     */
    public get type(): ExpressionType.ApplySymbolExpression { return ExpressionType.ApplySymbolExpression; }

    /**
     * The source expression to which the symbol is applied
     */
    public readonly source: TypedExpression<T>;

    /**
     * The symbol (property or method) being applied
     */
    public readonly symbol: symbol;

    /**
     * Optional argument passed when invoking the symbol
     */
    public readonly argument?: StrictExpressions;

    /**
     * Creates a new ApplySymbolExpression instance
     * @param {TypedExpression<T>} source - The base expression to apply the symbol to
     * @param {symbol} symbol - The property/method symbol to invoke
     * @param {StrictExpressions} [argument] - Optional argument value for the symbol invocation
     */
    constructor(source: TypedExpression<T>, symbol: symbol, argument?: StrictExpressions)
    {
        super();
        this.source = source;
        this.symbol = symbol;
        this.argument = argument;
    }

    /**
     * Accepts a visitor for the visitor pattern
     * @param {ExpressionVisitor} visitor - The visitor to process this node
     * @returns {StrictExpressions} The result of the visitor's processing
     */
    public accept(visitor: ExpressionVisitor): StrictExpressions
    {
        return visitor.visitApplySymbol(this);
    }
}
