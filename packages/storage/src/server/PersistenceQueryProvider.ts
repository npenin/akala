import { IQueryableProvider } from './Query';
import { Expressions } from './expressions/expression';
import { PersistenceEngine } from './PersistenceEngine';

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