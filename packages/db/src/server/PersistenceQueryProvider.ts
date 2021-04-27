import { IQueryableProvider, IQueryable } from './Query.js';
import { Expressions } from './expressions/expression.js';
import { PersistenceEngine } from './PersistenceEngine.js';

export class PersistenceEngineQueryProvider implements IQueryableProvider
{
    constructor(private readonly engine: PersistenceEngine)
    {
    }

    execute<TResult>(expression: Expressions): PromiseLike<TResult>
    {
        return this.engine.load<TResult>(expression);
    }
}