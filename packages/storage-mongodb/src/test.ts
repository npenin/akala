import { ApplySymbolExpression, BinaryOperator } from "@akala/core/expressions";
import { ModelDefinition, QuerySymbols } from "@akala/storage";
import { MongoClient } from "mongodb";
import { MongoDb } from "./persistenceengine.js";
import assert from 'assert'
import MongoDbTranslator from "./expression-visitor.js";

describe('query', () =>
{
    var pe = new MongoDb();
    var model = new ModelDefinition('pwet', 'pwic', null);
    model.fromJson({
        members: {
            name: { generator: null, name: 'name', nameInStorage: 'Name', isKey: true, type: 'string' },
            prop1: { generator: null, name: 'prop1', nameInStorage: 'Prop1', isKey: false, type: 'int' },
            prop2: { generator: null, name: 'prop2', nameInStorage: 'Prop2', isKey: false, type: 'boolean' }
        }
    });
    type ModelType = {
        name: string;
        prop1: number;
        prop2: boolean;
    }

    it('should work', async () =>
    {
        const client = new MongoClient('mongodb://172.17.0.5:27017');
        const db = client.db('test');

        try
        {
            await db.createCollection('pwic');
            await pe.init(db);
            await pe.dbSet<ModelType>(model.name).createSingle({ name: 'a', prop1: 1, prop2: true })
            await pe.dbSet<ModelType>(model.name).createSingle({ name: 'b', prop1: 2, prop2: true })
            await pe.dbSet<ModelType>(model.name).createSingle({ name: 'c', prop1: 3, prop2: false });
            var translator = new MongoDbTranslator(db);
            await translator.visit(
                new ApplySymbolExpression(pe.dbSet<ModelType>(model.name).where('prop2', BinaryOperator.Equal, true).expression, QuerySymbols.count)
            )
            assert.strictEqual(JSON.stringify(translator.pipelines, null, 4), JSON.stringify([{ $match: { $expr: { $eq: [{ $getField: 'prop2' }, true] } } }, { $group: { result: { $sum: 1 }, _id: null } }, { $project: { _id: 0 } }], null, 4));

            assert.strictEqual(await pe.dbSet<ModelType>(model.name).where('prop2', BinaryOperator.Equal, true).length(), 2);
        }
        finally
        {
            await db.dropCollection('pwic');
            await client.close()
        }
    })
});