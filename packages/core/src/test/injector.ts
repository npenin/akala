require('source-map-support').install();

import { register, injectWithName, chain } from '..';

var oldProxy = Proxy;

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

register('$config', chain(func, function (keys, ...args)
{
    return [keys.join('.')];
}));

register('$updateConfig', chain(func2, function (keys, dummy, key?: string)
{
    if (key)
        keys.push(key);
    return [dummy, keys.join('.')];
}));

injectWithName(['$config.pwet.a.b.c'], function (config)
{
    config.then((result) =>
    {
        console.log('key: ' + result);
    })
})();


injectWithName(['$updateConfig.pwet.a.b.c'], function (config)
{
    config({ x: 'y' }, 'd');
})();