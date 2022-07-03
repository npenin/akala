import { isProxy } from '@akala/core';
import { Serializable, SerializableObject } from '@akala/json-rpc-ws';
import fs from 'fs/promises'
import { inspect } from 'util'

export type ProxyConfiguration<T extends object = SerializableObject> = Configuration<T> & { [key in keyof T]: T[key] extends object ? ProxyConfiguration<T[key]> : T[key] };
//type SerializableConfig<T, TKey extends keyof T> = T[TKey] extends SerializableObject ? Configuration<T[TKey]> : T[TKey]

export default class Configuration<T extends object = SerializableObject>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private constructor(private readonly path: string, private readonly config?: T, private readonly rootConfig?: any)
    {
        if (typeof config == 'undefined')
            config = {} as unknown as T;
        if (typeof rootConfig == 'undefined')
            this.rootConfig = config;

        const desc = Object.getOwnPropertyDescriptor(this, 'rootConfig');
        desc.enumerable = false
        Object.defineProperty(this, 'rootConfig', desc);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public static new<T extends object = SerializableObject>(path: string, config?: T, rootConfig?: any): ProxyConfiguration<T>
    {
        return new Proxy(new Configuration<T>(path, config, rootConfig), {
            has(target, key)
            {
                if (typeof (key) == 'symbol')
                {
                    switch (key)
                    {
                        case inspect.custom:
                            return () => target.config;
                        case Symbol.toPrimitive:
                            return target[Symbol.toPrimitive];
                        case isProxy:
                            return true;
                        default:
                            throw new Error('Not supported');
                    }
                }
                return Reflect.has(target, key);
            },
            ownKeys(target)
            {
                return Reflect.ownKeys(target.config);
            },
            getOwnPropertyDescriptor(target, name)
            {
                return { value: this.get(target, name), configurable: true, enumerable: true };
            },
            get(target, key, receiver)
            {
                if (typeof (key) == 'symbol')
                {
                    switch (key)
                    {
                        case inspect.custom:
                            return () => target.config;
                        case Symbol.toPrimitive:
                            return target[Symbol.toPrimitive];
                        case isProxy:
                            return true;
                        default:
                            throw new Error('Not supported');
                    }
                }
                switch (key)
                {
                    case 'then':
                        return undefined;
                    case 'toString':
                        return target.toString.bind(target);
                    case 'commit':
                        return target.commit.bind(target);
                    default:
                        var result = target.get(key);
                        if (typeof result == 'undefined' && Reflect.has(target, key) && typeof key == 'string')
                            return Reflect.get(target, key, receiver);
                        return result;
                }
            },
            set(target, p, value, receiver)
            {
                if (!Reflect.has(target, p) && typeof p == 'string')
                {
                    target.set(p, value);
                    return true;
                }
                return Reflect.set(target, p, value, receiver);
            }
        }) as unknown as ProxyConfiguration<T>;
    }

    public extract()
    {
        return this.config;
    }

    public static async load<T extends object = SerializableObject>(file: string): Promise<ProxyConfiguration<T>>
    {
        try
        {
            const content = await fs.readFile(file, 'utf8');
            return Configuration.new<T>(file, JSON.parse(content));
        }
        catch (e)
        {
            console.error(e);
            return undefined;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    public get<TResult = string>(key?: string): typeof key extends keyof T ?
        TResult extends object ?
        TResult extends (infer X)[] ?
        X extends object ? X[] : Extract<Exclude<Serializable, SerializableObject>, TResult>
        : ProxyConfiguration<TResult & T[typeof key]>
        : Extract<Exclude<Serializable, SerializableObject>, TResult>
        : never
    {
        if (key)
        {
            var value = key.split('.').reduce(function (config, key)
            {
                if (typeof (config) === 'undefined')
                    return config;
                return config[key];
            }, this.config);
            if (typeof value == 'object' && !Array.isArray(value))
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return Configuration.new(this.path, value as SerializableObject, this.rootConfig) as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return value as any
                ;
        }
        else
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return this as any;
    }

    public has(key?: string): boolean
    {
        if (key)
        {
            return typeof (key.split('.').reduce(function (config, key)
            {
                if (typeof (config) === 'undefined')
                    return config;
                return config[key];
            }, this.config)) != 'undefined';
        }
        else
            return true;
    }

    public set(key: Exclude<keyof T, symbol | number>, newConfig: T[typeof key]): void
    public set(key: string, newConfig: Serializable): void
    public set(key: string | Exclude<keyof T, symbol | number>, newConfig: unknown): void
    public set(key: string | Exclude<keyof T, symbol | number>, newConfig: unknown): void
    {
        const keys = key.split('.');
        keys.reduce(function (config, key, i)
        {
            if (keys.length == i + 1)
            {
                config[key] = newConfig;
                // console.log(config);
            }
            else if (typeof (config[key]) == 'undefined')
                config[key] = {};

            return config[key];
        }, this.config);
    }

    public commit(file?: string, formatted?: boolean): Promise<void>
    {
        if (typeof formatted == 'undefined')
            formatted = process.env.NODE_ENV !== 'production';
        return fs.writeFile(file || this.path, JSON.stringify(this.rootConfig, null, formatted && 4 || undefined), 'utf8');
    }
}