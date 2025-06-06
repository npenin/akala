import { Container } from '../model/container.js';
import { inject, configure } from '../decorators.js';
import * as assert from 'assert'
import { describe, it } from 'node:test'

describe('test decorators', function ()
{
    it('should cover basics', async function ()
    {
        const container = new Container<null>('decorator', null);

        container.register(configure('http', { inject: ['route.step'] })(inject('params.0')(function f(a)
        {
            assert.strictEqual(a, 'test');
            return a;
        })));

        assert.strictEqual(await container.dispatch('f', { params: ['test'] }), 'test');
        assert.strictEqual(await container.dispatch('f', 'test'), 'test');
    })
});
