
var oldProxy = Proxy;

global['Proxy'] = new oldProxy(oldProxy, {
    get: function (target, key)
    {
        if (typeof (key) == 'symbol' && key == Symbol.hasInstance)
        {
            return function (o)
            {
                return o && o[Symbol.for('isProxy')];
            }
        }
        return Reflect.get(target, key);
    }
});

export function chain<T extends Function>(target: T, keyHandler: (keys: string[], ...args) => any[])
{
    var configProxyGetter = {
        get: function chain(target: T, key)
        {
            var keys: string[] = [];
            if (typeof (key) == 'symbol')
            {
                switch (key.toString())
                {
                    case 'Symbol(util.inspect.custom)':
                        return () => target;
                    case 'Symbol(Symbol.toPrimitive)':
                        return target[Symbol.toPrimitive];
                    case 'Symbol(isProxy)':
                        return true;
                    default:
                        throw new Error('Not supported');
                }
            }
            switch (key)
            {
                case 'then':
                    let c = target();
                    return c.then.bind(c);
                case 'apply':
                    return target.apply;
                case 'length':
                    return target.length;
                case 'toString':
                    return target.toString.bind(target);
                default:
                    keys.push(key);
                    let proxy = new Proxy(function (...args)
                    {
                        if (!args)
                            args = [];
                        args.unshift(keys);
                        return target.apply(this, keyHandler.apply(this, args));
                    }, {
                            get: function (getConfig, subKey)
                            {
                                if (typeof (subKey) == 'symbol')
                                {
                                    switch (subKey.toString())
                                    {
                                        case 'Symbol(util.inspect.custom)':
                                            return () => target;
                                        case 'Symbol(Symbol.toPrimitive)':
                                            return target[Symbol.toPrimitive];
                                        case 'Symbol(isProxy)':
                                            return true;
                                        default:
                                            throw new Error('Not supported');
                                    }
                                }
                                switch (subKey)
                                {
                                    case 'then':
                                        let c = target.apply(this, keyHandler(keys));
                                        return c.then.bind(c);
                                    case 'apply':
                                        return getConfig.apply;
                                    case 'length':
                                        return target.length;
                                    case 'toString':
                                        return target.toString.bind(target);
                                }
                                if (subKey)
                                    keys.push(subKey.toString());
                                return proxy;
                            }
                        });
                    return proxy;
            }
        }
    };
    return new Proxy(target, configProxyGetter);
}
