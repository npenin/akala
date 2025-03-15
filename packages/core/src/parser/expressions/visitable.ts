/**
 * Represents a visitable expression.
 * @param {Function} visitor - The visitor function.
 */
export interface IVisitable<T, TOut>
{
    accept(visitor: T): TOut;
}
