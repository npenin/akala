// eslint-disable-next-line @typescript-eslint/no-var-requires
import { Parser } from '../index.js';
import { Binding, ObservableObject } from '../observables/object.js';
import * as assert from 'assert';
import { it } from 'node:test'

// import 'source-map-support/register.js'

const target: {
    foo: {
        bar?: { a: number, b: string, c: boolean },
        baz?: { d: number, e: string, f: boolean }
    }
} = {
    foo: { bar: { a: 1, b: 'x', c: true } }
};

it('bindings should work', () =>
{

    let changeEventCalled = 0;
    const binding = new Binding<number>(target, Parser.parameterLess.parse('foo?.bar?.a'));
    binding.onChanged(ev =>
    {
        assert.ok(ev.value === undefined || ev.value > 1);
        changeEventCalled++;
    });

    let subChangeEventCalled = 0;
    const fooBinding = new Binding<typeof target['foo']>(target, Parser.parameterLess.parse('foo?'));
    const pipedBinding = new Binding<number>(fooBinding, Parser.parameterLess.parse('bar?.a'));
    pipedBinding.onChanged(ev =>
    {
        subChangeEventCalled++;
    })

    new ObservableObject(target).setValue('foo', { baz: { d: 2, e: 'y', f: false } })

    assert.strictEqual(changeEventCalled, 1);
    assert.strictEqual(target.foo.bar, undefined);
    assert.strictEqual(target.foo['baz']['d'], 2);

    changeEventCalled = 0;
    new ObservableObject(target.foo).setValue('bar', { a: 2, b: 'y', c: false })

    assert.strictEqual(changeEventCalled, 1);
    assert.strictEqual(target.foo.bar.a, 2);
    assert.strictEqual(target.foo['baz']['d'], 2);

    changeEventCalled = 0;
    new ObservableObject(target.foo.bar).setValue('a', 3)

    assert.strictEqual(changeEventCalled, 1);
    assert.strictEqual(target.foo.bar.a, 3);
    assert.strictEqual(target.foo['baz']['d'], 2);

    assert.strictEqual(subChangeEventCalled, 3);

})
