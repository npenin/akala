import { Container } from "../container";
import { inject, triggerredBy } from "../decorators";
import * as assert from 'assert'

describe('test decorators', function ()
{
    it('should cover basics', function ()
    {
        var container = new Container<null>('decorator', null);

        container.register(triggerredBy('http', { inject: ['route.step'] })(inject('param.0')(function f(a)
        {
            assert.strictEqual(a, 'test');
            return a;
        })));

        assert.strictEqual(container.dispatch('f', 'test'), 'test');
    })
});