/** 
 * @typedef {Proxy} OldProxy - Original Proxy constructor reference
 */
const oldProxy = Proxy;

/**
 * Symbol to identify proxy instances
 * @type {Symbol}
 */
export const isProxy = Symbol.for('isProxy');

/**
 * Node.js inspect symbol for custom object display
 * @type {Symbol}
 */
export const customInspect = Symbol.for('nodejs.util.inspect.custom');

/**
 * Overrides global Proxy to enhance type checking
 * @description Adds hasInstance check to determine if object is a proxy
 */
globalThis['Proxy'] = new oldProxy(oldProxy, {
    get: function (target, key)
    {
        if (typeof key === 'symbol' && key === Symbol.hasInstance)
        {
            return function (o)
            {
                return o && o[isProxy];
            };
        }
        return Reflect.get(target, key);
    }
});

/**
 * Creates a method-chaining proxy for functions
 * @template T - Target function type
 * @param {T} target - Function to wrap with proxy
 * @param {(keys: string[], ...args: unknown[]) => unknown[]} keyHandler - Callback to process keys and arguments
 * @returns {Proxy<T>} - Proxied function supporting chained method calls
 */
export function chain<T extends (...args: unknown[]) => unknown>(
    target: T,
    keyHandler: (keys: PropertyKey[], ...args: unknown[]) => unknown[]
)
{
    const configProxyGetter = {
        get: function chain(target: T, key: PropertyKey)
        {
            const keys: PropertyKey[] = [];
            if (typeof key === 'symbol')
            {
                switch (key)
                {
                    case customInspect:
                        return () => target;
                    case Symbol.toPrimitive:
                        return target[Symbol.toPrimitive];
                    case isProxy:
                        return true;
                    default:
                        throw new Error('Unsupported symbol operation');
                }
            }
            switch (key)
            {
                case 'then':
                    {
                        const c = target() as Promise<void>;
                        return c.then.bind(c);
                    }
                case 'apply':
                    return target.apply;
                case 'length':
                    return target.length;
                case 'toString':
                    return target.toString.bind(target);
                default:
                    {
                        keys.push(key);
                        const proxy = new Proxy(
                            function (...args: unknown[])
                            {
                                args.unshift(...keys);
                                return target.apply(
                                    this,
                                    keyHandler.call(this, keys, ...args)
                                );
                            },
                            {
                                get: function (
                                    getConfig: Function,
                                    subKey: PropertyKey
                                )
                                {
                                    if (typeof subKey === 'symbol')
                                    {
                                        switch (subKey)
                                        {
                                            case customInspect:
                                                return () => target;
                                            case Symbol.toPrimitive:
                                                return target[Symbol.toPrimitive];
                                            case isProxy:
                                                return true;
                                            default:
                                                throw new Error(
                                                    'Unsupported symbol operation'
                                                );
                                        }
                                    }
                                    switch (subKey)
                                    {
                                        case 'then':
                                            {
                                                const c = target.apply(
                                                    this,
                                                    keyHandler(keys)
                                                ) as Promise<any>;
                                                return c.then.bind(c);
                                            }
                                        case 'apply':
                                            return getConfig.apply;
                                        case 'length':
                                            return target.length;
                                        case 'toString':
                                            return target.toString.bind(target);
                                    }
                                    if (subKey)
                                        keys.push(subKey);
                                    return proxy;
                                },
                            }
                        );
                        return proxy;
                    }
            }
        },
    };
    return new Proxy(target, configProxyGetter);
}
