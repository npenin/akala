import { Expressions } from '@akala/core/expressions';
import { ModelDefinition, PersistenceEngine } from '@akala/storage'
import { Collection, Db, Document } from 'mongodb';
import CommandProcessor from './command-processor.js';
import MongoDbTranslator from './expression-visitor.js';
import { NotHandled } from '@akala/core';


export class MongoDb extends PersistenceEngine<Db, { collection: string, pipeline: Document[] }>
{
    private db: Db;

    constructor()
    {
        super(new CommandProcessor());
    }

    public rawQuery<T>(query: { collection: string, pipeline: Document[] }): PromiseLike<T>
    {
        const collection = this.db.collection(query.collection);

        const result = collection.aggregate(query.pipeline);

        return result.tryNext().then(d => result.close().then(() => d.result));
    }

    init(connection: Db): Promise<void>
    {
        this.processor.init(connection);
        this.db = connection;
        return NotHandled;
    }
    async load<T>(expression: Expressions): Promise<T>
    {
        const executor = new MongoDbTranslator();
        const oldVisitContant = executor.visitConstant;
        const db = this.db;
        let collection: Collection;
        executor.visitConstant = function (cte)
        {
            if (cte.value instanceof ModelDefinition)
            {
                this.result = collection = db.collection(cte.value.nameInStorage);

                this.model = cte.value;
                return cte;
            }
            return oldVisitContant.call(this, cte);
        }
        executor.result = db;
        executor.visit(expression);
        const result = collection.aggregate(executor.pipelines)
        if (executor.model)
            return this.dynamicProxy(result, executor.model) as unknown as T;
        else
            return result.tryNext().then(d => result.close().then(() => d.result));
    }
}
