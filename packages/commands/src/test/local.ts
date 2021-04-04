import { calculator } from './calculator'
import * as assert from 'assert'

describe('test local processing', function ()
{
    it('should handle basics', function ()
    {
        calculator.dispatch('reset');
        assert.equal(calculator.state.value, 0)
        calculator.dispatch('increment');
        assert.equal(calculator.state.value, 1)
        calculator.dispatch('increment');
        assert.equal(calculator.state.value, 2)
        calculator.dispatch('decrement');
        assert.equal(calculator.state.value, 1)
        calculator.dispatch('decrement');
        assert.equal(calculator.state.value, 0)
    })
})