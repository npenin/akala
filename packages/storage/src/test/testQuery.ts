import { File, Store, StoreDefinition, DbSet, QuerySymbols } from '../index.js';
import { ModelTest1 } from './modelTest1.js';
import assert from 'assert';
import './modelTest1.js';
import { expressions } from '@akala/core';

interface TestStore extends StoreDefinition
{
    ModelTest1: DbSet<ModelTest1>;
}

describe('where builder', function ()
{
    it('generates', async function ()
    {

        var fpe = await File.fromJson(__dirname);
        var store = Store.create<TestStore>(fpe, 'ModelTest1');

        var where = store.ModelTest1.where('s1=="test"');
        assert.ok(where);
        assert.ok(where.expression);
        assert.equal(expressions.ExpressionType[where.expression.type], expressions.ExpressionType[expressions.ExpressionType.ApplySymbolExpression]);
        if (where.expression.type == expressions.ExpressionType.ApplySymbolExpression)
        {
            assert.equal(where.expression.symbol, QuerySymbols.where);
            assert.equal(where.expression.argument.type, expressions.ExpressionType.LambdaExpression)
            if (where.expression.argument.type == expressions.ExpressionType.LambdaExpression)
            {
                assert.equal(expressions.ExpressionType[where.expression.argument.body.type], expressions.ExpressionType[expressions.ExpressionType.BinaryExpression]);
                if (where.expression.argument.body.type == expressions.ExpressionType.BinaryExpression)
                {
                    assert.equal(where.expression.argument.body.operator, expressions.BinaryOperator.Equal);
                    assert.equal(where.expression.argument.body.left.type, expressions.ExpressionType.MemberExpression);
                    assert.equal(where.expression.argument.body.right.type, expressions.ExpressionType.ConstantExpression);
                }
            }
        }
    })
})