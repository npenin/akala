import { Container } from '../model/container.js';
import { inject, configure } from '../decorators.js';
import * as assert from 'assert'

describe('test decorators', function ()
{
    it('should cover basics', function ()
    {
        const container = new Container<null>('decorator', null);

        container.register(configure('http', { inject: ['route.step'] })(inject('param.0')(function f(a)
        {
            assert.strictEqual(a, 'test');
            return a;
        })));

        assert.strictEqual(container.dispatch('f', { param: ['test'] }), 'test');
        assert.strictEqual(container.dispatch('f', 'test'), 'test');
    })
});