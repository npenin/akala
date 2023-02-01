// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Binding } from '../binder.js';
import * as assert from 'assert';

const target = {
    foo: { bar: { a: 1, b: 'x', c: true } }
};

let changeEventCalled = false;
const binding = new Binding('foo.bar.a', target);
binding.onChanged(ev =>
{
    assert.strictEqual(ev.eventArgs.value, undefined);
    changeEventCalled = true;
}, true);

Binding.getSetter(target, 'foo', undefined)({ baz: { d: 2, e: 'y', f: false } }, undefined).then(() =>
{
    assert.ok(changeEventCalled, 'changeEventNotCalled');
    assert.strictEqual(target.foo.bar, undefined);
    assert.strictEqual(target.foo['baz']['d'], 2);
});