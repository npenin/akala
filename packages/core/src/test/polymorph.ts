// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Polymorph } from '../polymorph.js'
import assert from 'assert'
import { it } from 'node:test'

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

it('polymorph should work', () =>
{
    assert.deepEqual(Test.transition(noop), { selector: undefined, rollback: undefined, duration: undefined, callback: noop });
    assert.deepEqual(Test.transition(1, noop), { selector: undefined, rollback: undefined, duration: 1, callback: noop });
    assert.deepEqual(Test.transition(false, 1, noop), { selector: undefined, rollback: false, duration: 1, callback: noop });
    assert.deepEqual(Test.transition(false, noop), { selector: undefined, duration: undefined, rollback: false, callback: noop });
    assert.deepEqual(Test.transition('pwic', noop), { selector: 'pwic', rollback: undefined, duration: undefined, callback: noop });
    assert.deepEqual(Test.transition('pwic', 1, noop), { selector: 'pwic', rollback: undefined, duration: 1, callback: noop });
    assert.deepEqual(Test.transition('pwic', false, noop), { selector: 'pwic', duration: undefined, rollback: false, callback: noop });
    assert.deepEqual(Test.transition('pwic', false, 1, noop), { selector: 'pwic', rollback: false, duration: 1, callback: noop });
})
