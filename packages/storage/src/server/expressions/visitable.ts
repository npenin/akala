export interface IVisitable<T, TOut>
{
    accept(visitor: T): TOut;
}