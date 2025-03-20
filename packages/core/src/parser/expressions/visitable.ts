/**
 * Interface for objects that can accept a visitor as part of the visitor pattern.
 * @template T - The type of the visitor instance
 * @template TOut - The return type of the visitor's visit method
 */
export interface IVisitable<T, TOut>
{
    /**
     * Accepts a visitor to perform operations via the visitor pattern.
     * @param visitor - The visitor instance to process this object
     * @returns The result from the visitor's corresponding visit method
     */
    accept(visitor: T): TOut;
}
