// eslint-disable-next-line @typescript-eslint/no-var-requires
import 'source-map-support/register'

import { module } from '../index.js';
import * as assert from 'assert'

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
    console.log('activation of c');
    assert.ok(activate.a, 'a is not activated for c');
    assert.ok(activate.b, 'b is not activated for c');
    activate.c = true;
})

module('c').start([], () => assert.deepEqual(activate, { a: true, b: true, c: true }));