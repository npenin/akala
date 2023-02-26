import { calculator } from './calculator/index.js'
import * as assert from 'assert'

describe('test local processing', function ()
{
    it('should handle basics', async function ()
    {
        calculator.dispatch('reset');
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