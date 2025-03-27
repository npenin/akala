// eslint-disable-next-line @typescript-eslint/no-var-requires
import 'source-map-support/register.js'

import { module } from '../index.js';
import * as assert from 'assert'
import { it } from 'node:test'

it('module should work', async () =>
{
    const activate: { [key: string]: boolean } = {};

    module('a').activate([], function ()
    {
        activate.a = true;
    })
    module('b', 'a').activate([], function ()
    {
        assert.ok(activate.a, 'a is not activated for b');

        activate.b = true;
    })
    module('c').activate([], async function ()
    {
        await module('b').start();

        if (!activate.a || !activate.b)
            throw new Error();
    })
    module('c').activate([], function ()
    {
        assert.ok(activate.a, 'a is not activated for c');
        assert.ok(activate.b, 'b is not activated for c');
        activate.c = true;
    })

    await module('c').start();
    assert.ok(activate.a, 'a was not activated');
    assert.ok(activate.b, 'b was not activated');
    assert.ok(activate.c, 'c was not activated');
    assert.deepEqual(activate, { a: true, b: true, c: true });
});
