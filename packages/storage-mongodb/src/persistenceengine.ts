import { Expressions } from '@akala/core/expressions';
import { ModelDefinition, PersistenceEngine } from '@akala/storage'
import { Collection, Db } from 'mongodb';
import CommandProcessor from './command-processor.js';
import MongoDbTranslator from './expression-visitor.js';


export class MongoDb extends PersistenceEngine<Db>
{
    private db: Db;

    constructor()
    {
        super(new CommandProcessor());
    }

    init(connection: Db): Promise<void>
    {
        this.processor.init(connection);
        this.db = connection;
        return Promise.resolve();
    }
    async load<T>(expression: Expressions): Promise<T>
    {
        const executor = new MongoDbTranslator(this.db);
        var oldVisitContant = executor.visitConstant;
        const db = this.db;
        var collection: Collection;
        executor.visitConstant = function (cte)
        {
            if (cte.value instanceof ModelDefinition)
            {
                this.result = collection = db.collection(cte.value.nameInStorage);

                this.model = cte.value;
                return Promise.resolve(cte);
            }
            return oldVisitContant.call(this, cte);
        }
        executor.result = db;
        await executor.visit(expression);
        const result = collection.aggregate(executor.pipelines)
        if (executor.model)
            return this.dynamicProxy(result, executor.model) as unknown as T;
        else
            return result.tryNext().then(d => result.close().then(() => d.result));
    }
}