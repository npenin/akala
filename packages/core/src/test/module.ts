require('source-map-support').install();

import { module } from '..';
import * as assert from 'assert'

var activate: any = {};
var ready: any = {};

module('a').activate([], function ()
{
    activate.a = true;
})
module('b', 'a').activate([], function ()
{
    activate.b = true;
})
module('c').activate([], function ()
{
    activate.c = true;
})
module('c', 'b').activate([], function ()
{
    if (!activate.a || !activate.b)
        throw new Error();
})

module('c').start([], () => assert.deepEqual(activate, { a: true, b: true, c: true }));
module('c').start();