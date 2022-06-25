// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Injector } from '../injector';
import assert from 'assert';
import { useInjector, inject } from '../reflection-injector';

/*var oldProxy = Proxy;

global['Proxy'] = new oldProxy(oldProxy, {
    get: function (target, key)
    {
        if (typeof (key) == 'symbol' && key == Symbol.hasInstance)
        {
            return function (o)
            {
                return o[Symbol.for('isChain')];
            }
        }
        return Reflect.get(target, key);
    }
});


var func = function (key?)
{
    console.log('original function');
    return new Promise((resolve, reject) =>
    {
        resolve(key);
    })
};

var func2 = function (dummy, key?)
{
    console.log('original function2');
    console.log(key);
};

var i1 = new Injector();
i1.register('$config', chain(func, function (keys, ...args)
{
    return [keys.join('.')];
}));

i1.register('$updateConfig', chain(func2, function (keys, dummy, key?: string)
{
    if (key)
        keys.push(key);
    return [dummy, keys.join('.')];
}));

i1.injectWithName(['$config.pwet.a.b.c'], function (config)
{
    config.then((result) =>
    {
        console.log('key: ' + result);
    })
})();


i1.injectWithName(['$updateConfig.pwet.a.b.c'], function (config)
{
    config({ x: 'y' }, 'd');
})();*/

const i = new Injector();
i.register('os', 'linux')
i.register('vendor', 'microsoft')
i.register('action', 'loves')
i.register('otherVendor', 'node')

const subI = new Injector(i);
@useInjector(subI)
class A
{
    @inject('os')
    public os: string;

    @inject()
    public vendor: string;

    public otherVendor: string;

    constructor(@inject('otherVendor') otherVendor?: string)
    {
        this.otherVendor = otherVendor;
    }

    public do(@inject('action') action: string)
    {
        return `${this.vendor} ${action} ${this.os}`;
    }

    public doOtherVendor(@inject('action') action: string)
    {
        return `${this.vendor} ${action} ${this.otherVendor}`;
    }
}
const a = new A();

assert.strictEqual(a.os, i.resolve('os'), 'named injection does not work');
assert.strictEqual(a.vendor, i.resolve('vendor'), 'implicit injection does not work');
assert.strictEqual(a.otherVendor, i.resolve('otherVendor'), 'constructor injection does not work');
assert.strictEqual(a.do('likes'), `${i.resolve('vendor')} ${i.resolve('action')} ${i.resolve('os')}`, 'parameter injection does not work');


class B extends A
{
    constructor()
    {
        super();
    }
}

const b = new B();

assert.strictEqual(b.os, i.resolve('os'), 'named injection does not work on inherited classes');
assert.strictEqual(b.vendor, i.resolve('vendor'), 'implicit injection does not work on inherited classes');
assert.strictEqual(b.do('loves'), 'microsoft loves linux', 'parameter injection does not work on inherited classes');
assert.strictEqual(b.doOtherVendor('loves'), 'microsoft loves node', 'parameter injection does not work on inherited classes');

// nested resolutions
const i1 = new Injector();
const i2 = i1.register('a', new Injector());
i2.register('b.c', 'x');
assert.strictEqual(i1.resolve('a.b.c'), 'x')