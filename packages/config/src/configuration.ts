import { isProxy } from '@akala/core';
import { Serializable, SerializableObject } from '@akala/core';
import fs from 'fs/promises'
import { inspect } from 'util'

export type ProxyConfiguration<T> = T extends object ? ProxyConfigurationObject<T> : Extract<Exclude<Serializable, SerializableObject | SerializableObject[]>, T>;
export type ProxyConfigurationObject<T extends object> = T extends (infer X)[] ? X[] : ProxyConfigurationObjectNonArray<T>;
export type ProxyConfigurationObjectNonArray<T extends object> = Configuration<T> & { [key in keyof T]: T[key] extends object ? ProxyConfiguration<T[key]> : T[key] };
//type SerializableConfig<T, TKey extends keyof T> = T[TKey] extends SerializableObject ? Configuration<T[TKey]> : T[TKey]
const unwrap = Symbol('unwrap configuration');

const crypto = globalThis.crypto;
const { subtle } = globalThis.crypto;

async function generateAesKey(length = 256)
{
    const key = await subtle.generateKey({
        name: 'AES-CBC',
        length,
    }, true, ['encrypt', 'decrypt']);

    return key;
}

async function aesEncrypt(plaintext: string, key?: CryptoKey)
{
    const ec = new TextEncoder();
    if (!key)
        key = await generateAesKey();
    const iv = crypto.getRandomValues(new Uint8Array(16));

    const ciphertext = await subtle.encrypt({
        name: 'AES-CBC',
        iv,
    }, key, ec.encode(plaintext));

    return {
        key,
        iv,
        ciphertext,
    };
}

async function aesDecrypt(ciphertext: BufferSource, key: CryptoKey, iv: BufferSource)
{
    const dec = new TextDecoder();
    const plaintext = await subtle.decrypt({
        name: 'AES-CBC',
        iv,
    }, key, ciphertext);

    return dec.decode(plaintext);
}

export default class Configuration<T extends object = SerializableObject>
{
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private constructor(private readonly path: string, private readonly config?: T, private readonly rootConfig?: any, private cryptKey?: CryptoKey)
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
    public static async new<T extends object = SerializableObject>(path: string, config?: T, rootConfig?: any, cryptKey?: CryptoKey): Promise<ProxyConfigurationObjectNonArray<T>>
    {
        if (typeof cryptKey == 'undefined')
        {
            cryptKey = await Configuration.loadKey(path)
        }
        return new Proxy(new Configuration<T>(path, config, rootConfig, cryptKey), {
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
                        case unwrap:
                            return target;
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
                    default:
                        if (typeof key == 'number' || typeof key == 'symbol')
                            throw new Error(`Unsupported key type: ${typeof key}, value: ${key}`);
                        var result = target.get(key as Exclude<keyof T, number | symbol>);
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
            },
            deleteProperty(target, p)
            {
                if (!Reflect.has(target, p) && typeof p == 'string')
                {
                    target.delete(p);
                    return true;
                }
                return Reflect.deleteProperty(target, p);

            },
        }) as ProxyConfigurationObjectNonArray<T>;
    }

    public extract()
    {
        return this.config;
    }

    public toString()
    {
        if (this == this[unwrap])
            return { config: this.config, path: this.path }.toString();
        return this[unwrap].toString();
    }

    public static async load<T extends object = SerializableObject>(file: string, createIfEmpty?: boolean, needle?: string): Promise<ProxyConfiguration<T>>
    {
        let content: string;
        let cryptKey: CryptoKey;
        if (!needle)
        {
            const indexOfHash = file.indexOf('#');
            if (indexOfHash > 0)
            {
                needle = file.substring(indexOfHash + 1);
                file = file.substring(0, indexOfHash);
            }
        }
        try
        {
            content = await fs.readFile(file, 'utf8');
            cryptKey = await Configuration.loadKey(file);

        }
        catch (e)
        {
            if (!createIfEmpty || e.code !== 'ENOENT')
                throw e;

            await fs.writeFile(file, content = '{}');
        }
        const config = await Configuration.new(file, JSON.parse(content), undefined, cryptKey);
        if (needle)
        {
            const needleConfig = config.get<string, T>(needle);
            if (needleConfig)
                return needleConfig;
            config.set(needle, {});
            return config.get<string, T>(needle);
        }
        return config as ProxyConfiguration<T>;
    }

    public static loadKey(path: string): Promise<CryptoKey | null>
    {
        return fs.readFile(path + '.key').then(keyContent => subtle.importKey('raw', keyContent, { name: 'AES-CBC' }, true, ['encrypt', 'decrypt']), () => null);
    }

    public get<TResult = string>(key?: string): ProxyConfiguration<TResult>
    public get<const TKey extends Exclude<keyof T, number | symbol>, TResult = T[TKey]>(key?: TKey): ProxyConfiguration<TResult>
    public get<const TKey extends string = Exclude<keyof T, number | symbol>, TResult = TKey extends keyof T ? T[TKey] : string>(key?: TKey): ProxyConfiguration<TResult>
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
                return Configuration.new(this.path, value as SerializableObject, this.rootConfig, this.cryptKey) as any;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return value as any
                ;
        }
        else
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return this as any;
    }

    [unwrap] = this;

    public getSecret(key: string): Promise<string>
    {
        const self = this[unwrap];
        const secret = self.get<{ iv: string, value: string }>(key).extract();
        const enc = new TextEncoder();
        return aesDecrypt(enc.encode(secret.value), self.cryptKey, enc.encode(secret.iv));
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

    public async setSecret(key: string | Exclude<keyof T, symbol | number>, newConfig: string): Promise<void>
    {
        const self = this[unwrap];
        const secret = await aesEncrypt(newConfig, self.cryptKey);
        if (!self.cryptKey)
            self.cryptKey = secret.key;
        const enc = new TextDecoder()
        self.set(key, { iv: enc.decode(secret.iv), value: enc.decode(secret.ciphertext) });
    }

    public delete(key: Exclude<keyof T, symbol | number>): void
    public delete(key: string): void
    public delete(key: string | Exclude<keyof T, symbol | number>): void
    public delete(key: string | Exclude<keyof T, symbol | number>): void
    {
        const keys = key.split('.');
        keys.reduce(function (config, key, i)
        {
            if (typeof config === 'undefined')
                return;
            if (typeof config[key] !== 'undefined' && keys.length == i + 1)
            {
                delete config[key];
                // console.log(config);
            }

            return config[key];
        }, this.config);
    }

    public async commit(file?: string, formatted?: boolean): Promise<void>
    {
        const self = this[unwrap];
        if (typeof formatted == 'undefined')
            formatted = process.env.NODE_ENV !== 'production';
        await fs.writeFile(file || self.path, JSON.stringify(self.rootConfig, null, formatted && 4 || undefined), 'utf8');
        if (self.cryptKey)
            await fs.writeFile((file || self.path) + '.key', Buffer.from(await subtle.exportKey('raw', self.cryptKey)));

    }
}