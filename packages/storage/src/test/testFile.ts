/* eslint-disable no-debugger, no-console */

import * as akala from '@akala/core'
import mock from 'mock-require'
mock('@akala/core', akala);
mock('@akala/server', akala);
import * as db from '../server/index.js'
import { File } from '../server/providers/file.js';
import { ModelTest1 } from './modelTest1.js';
import * as assert from 'assert'
import 'mocha';

interface TestStore extends db.StoreDefinition
{
    ModelTest1: db.DbSet<ModelTest1>;
}

describe('simple query', function ()
{
    it('works with simple commands', async function ()
    {
        var fpe = await File.fromJson(__dirname);
        var store = db.Store.create<TestStore>(fpe, 'ModelTest1');

        var obj = await store.ModelTest1.where('s1', akala.expressions.BinaryOperator.Equal, 'pwic').firstOrDefault();
        if (obj)
        {
            fpe.beginTransaction();
            debugger;
            fpe.addCommand(store.ModelTest1.delete(obj));
            await fpe.commitTransaction();
        }

        obj = new ModelTest1();
        obj.s1 = 'pwic';
        obj.s2 = 'pwet';
        fpe.beginTransaction();
        fpe.addCommand(store.ModelTest1.create(obj));
        await fpe.commitTransaction();

        var cnt = await store.ModelTest1.where('s1', akala.expressions.BinaryOperator.Equal, 'pwic').length();
        assert.notStrictEqual(cnt, 0, 'fount 0 item with s1=pwic');
        assert.equal(cnt, 1, 'found ' + cnt + ' item with s1=pwic');
        for await (var value of store.ModelTest1.where('s1', akala.expressions.BinaryOperator.Equal, 'pwic'))
        {
            assert.equal(await value.s1, 'pwic')
            assert.equal(await value.s2, 'pwet')
        }
    });

    it('works with query on non key', async function ()
    {
        var fpe = await File.fromJson(__dirname);
        var store = db.Store.create<TestStore>(fpe, 'ModelTest1');

        fpe.beginTransaction();
        debugger;
        for await (var obj of store.ModelTest1.where('s2', akala.expressions.BinaryOperator.Equal, 'pwet'))
            fpe.addCommand(store.ModelTest1.delete(obj));
        await fpe.commitTransaction();

        fpe.beginTransaction();
        obj = new ModelTest1();
        obj.s1 = 'pwic';
        obj.s2 = 'pwet';
        fpe.serialize(obj, store.ModelTest1);
        // fpe.addCommand(store.ModelTest1.create(obj));
        obj = new ModelTest1();
        obj.s1 = 'prout';
        obj.s2 = 'pwet';
        fpe.addCommand(store.ModelTest1.create(obj));
        await fpe.commitTransaction();

        try
        {
            var obj = await store.ModelTest1.where('s2', akala.expressions.BinaryOperator.Equal, 'pwet').singleOrDefault();
            assert.fail('exception should have been thrown');
        }
        catch (e)
        {
            //normal behaviour
        }
        assert.equal(await store.ModelTest1.where('s2', akala.expressions.BinaryOperator.Equal, 'pwet').length(), 2, 'we should have 2 objects with s2=pwet')
    });

    it('works with grouped query', async function ()
    {
        var fpe = await File.fromJson(__dirname);
        var store = db.Store.create<TestStore>(fpe, 'ModelTest1');

        fpe.beginTransaction();
        for await (var obj of store.ModelTest1.where('s2', akala.expressions.BinaryOperator.Equal, 'pwet'))
            fpe.addCommand(store.ModelTest1.delete(obj));
        await fpe.commitTransaction();

        fpe.beginTransaction();
        obj = new ModelTest1();
        obj.s1 = 'pwic';
        obj.s2 = 'pwet';
        fpe.serialize(obj, store.ModelTest1);
        // fpe.addCommand(store.ModelTest1.create(obj));
        obj = new ModelTest1();
        obj.s1 = 'prout';
        obj.s2 = 'pwet';
        fpe.addCommand(store.ModelTest1.create(obj));
        await fpe.commitTransaction();

        try
        {
            var group = await store.ModelTest1.groupBy('s2').singleOrDefault();
            assert.strictEqual(group.key, 'pwet');
            assert.strictEqual(await group.value.length(), 2);
        }
        catch (e)
        {
            //normal behaviour
        }
    });

})