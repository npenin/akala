import { Container } from '../model/container.js';
import { inject, configure } from '../decorators.js';
import * as assert from 'assert'

describe('test decorators', function ()
{
    it('should cover basics', async function ()
    {
        const container = new Container<null>('decorator', null);

        container.register(configure('http', { inject: ['route.step'] })(inject('param.0')(function f(a)
        {
            assert.strictEqual(a, 'test');
            return a;
        })));

        assert.strictEqual(await container.dispatch('f', { param: ['test'] }), 'test');
        assert.strictEqual(await container.dispatch('f', 'test'), 'test');
    })
});