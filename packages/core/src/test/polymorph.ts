// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Polymorph } from '../polymorph.js'
import * as assert from 'assert'

class Test
{
    public static transition(callback?: () => void)
    public static transition(duration?: number, callback?: () => void)
    public static transition(rollback?: boolean, duration?: number, callback?: () => void)
    public static transition(rollback?: boolean, callback?: () => void)
    public static transition(selector?: string, callback?: () => void)
    public static transition(selector?: string, duration?: number, callback?: () => void)
    public static transition(selector?: string, rollback?: boolean, callback?: () => void)
    public static transition(selector?: string, rollback?: boolean, duration?: number, callback?: () => void)

    @Polymorph('string', 'boolean', 'number', 'function')
    public static transition(selector?: string | boolean | number | (() => void), rollback?: boolean | number | (() => void), duration?: number | (() => void), callback?: () => void)
    {
        if (typeof selector != 'undefined')
            assert.strictEqual(typeof (selector), 'string');
        if (typeof rollback != 'undefined')
            assert.strictEqual(typeof (rollback), 'boolean');
        if (typeof duration != 'undefined')
            assert.strictEqual(typeof (duration), 'number');
        if (typeof callback != 'undefined')
            assert.strictEqual(typeof (callback), 'function');
        return { selector, rollback, duration, callback }
    }
}

// eslint-disable-next-line @typescript-eslint/no-empty-function
function noop() { }

console.log(Test.transition(noop));
console.log(Test.transition(1, noop));
console.log(Test.transition(false, 1, noop));
console.log(Test.transition(false, noop));
console.log(Test.transition('pwic', noop));
console.log(Test.transition('pwic', 1, noop));
console.log(Test.transition('pwic', false, noop));
console.log(Test.transition('pwic', false, 1, noop));
console.log('success')