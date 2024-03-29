import { IQueryableProvider } from './Query.js';
import { PersistenceEngine } from './PersistenceEngine.js';
import { Expressions } from '@akala/core/expressions';

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