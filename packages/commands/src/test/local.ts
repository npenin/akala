import { calculator } from './calculator/index.js'
import * as assert from 'assert'
import { describe, it } from 'node:test'

describe('test local processing', function ()
{
    it('should handle basics', async function ()
    {
        await calculator.dispatch('reset');
        assert.equal(calculator.state.value, 0)
        await calculator.dispatch('increment');
        assert.equal(calculator.state.value, 1)
        await calculator.dispatch('increment');
        assert.equal(calculator.state.value, 2)
        await calculator.dispatch('decrement');
        assert.equal(calculator.state.value, 1)
        await calculator.dispatch('decrement');
        assert.equal(calculator.state.value, 0)
    })
})
