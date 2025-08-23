import { isProxy, base64, type Serializable, type SerializableObject, ErrorWithStatus, HttpStatusCode } from '@akala/core';
import fsHandler, { FileSystemProvider } from '@akala/fs';
import { isAbsolute } from 'path';
import { inspect } from 'util'

export type ProxyConfiguration<T> = T extends object ? ProxyConfigurationObject<T> : Extract<Exclude<Serializable, SerializableObject | SerializableObject[]>, T>;
export type ProxyConfigurationObject<T extends object> = T extends (infer X)[] ? X[] : ProxyConfigurationObjectNonArray<T>;
export type ProxyConfigurationObjectNonArray<T extends object> = Configuration<T> & { [key in keyof T]: T[key] extends object ? ProxyConfiguration<T[key]> : T[key] };
//type SerializableConfig<T, TKey extends keyof T> = T[TKey] extends SerializableObject ? Configuration<T[TKey]> : T[TKey]
export const unwrap = Symbol('unwrap configuration');

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
    private constructor(private readonly fs: FileSystemProvider, public readonly path: string | URL, private readonly config?: T, private readonly rootConfig?: any, private cryptKey?: CryptoKey)
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
    public static async newAsync<T extends object = SerializableObject>(path: string | URL, config?: T, rootConfig?: any, cryptKey?: CryptoKey): Promise<ProxyConfigurationObjectNonArray<T>>
    {

        if (typeof path === 'string')
            if (!URL.canParse(path))
                if (isAbsolute(path))
                    path = new URL('file://' + path);
                else
                    path = new URL('file:' + path);
            else
                path = new URL(path)

        const fs = await fsHandler.process(new URL('./', path));

        if (typeof cryptKey == 'undefined')
        {
            cryptKey = await Configuration.loadKey(fs, path)
        }
        return Configuration.new(fs, path, config, rootConfig, cryptKey);
    }

    public static new<T extends object = SerializableObject>(fs: FileSystemProvider, path: string | URL, config?: T, rootConfig?: any, cryptKey?: CryptoKey): ProxyConfigurationObjectNonArray<T>
    {
        if (config && 'commit' in config && typeof config.commit == 'function')
            delete config.commit;



        return new Proxy(new Configuration<T>(fs, path, config, rootConfig, cryptKey), {
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
                        case unwrap:
                            return true;
                        default:
                            return false;
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
                    default: {
                        if (typeof key == 'number' || typeof key == 'symbol')
                            throw new Error(`Unsupported key type: ${typeof key}, value: ${key}`);
                        const result = target.get(key as Exclude<keyof T, number | symbol>);
                        if (typeof result == 'undefined' && Reflect.has(target, key) && typeof key == 'string')
                            return Reflect.get(target, key, receiver);
                        return result;
                    }
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

    public static async load<T extends object = SerializableObject>(file: string | URL, createIfEmpty?: boolean, needle?: string): Promise<ProxyConfiguration<T>>
    {
        let content: string;
        let cryptKey: CryptoKey;
        if (!needle)
        {
            if (file instanceof URL)
            {
                needle = file.hash;
                file = new URL('', file);
            }
            else
            {
                const indexOfHash = file.indexOf('#');
                if (indexOfHash > 0)
                {
                    needle = file.substring(indexOfHash + 1);
                    file = file.substring(0, indexOfHash);
                }
            }
        }
        if (typeof file === 'string')
            if (!URL.canParse(file))
                if (isAbsolute(file))
                    file = new URL('file://' + file);
                else
                    file = new URL('file:' + file);
            else
                file = new URL(file)

        const fs = await fsHandler.process(new URL('./', file));

        try
        {

            content = await fs.readFile(file, { encoding: 'utf8' });
            cryptKey = await Configuration.loadKey(fs, file);

        }
        catch (e)
        {
            if (!createIfEmpty || e.code !== 'ENOENT')
                throw e;

            await fs.writeFile(file, content = '{}');
        }
        const config = Configuration.new(fs, file, JSON.parse(content), undefined, cryptKey);
        const unwrapped = config[unwrap] as Configuration<T>;
        if (needle)
        {
            const needleConfig = unwrapped.get<T>(needle);
            if (needleConfig)
                return needleConfig;
            unwrapped.set(needle, {});
            return unwrapped.get<T>(needle);
        }
        return config as ProxyConfiguration<T>;
    }

    public static loadKey(fs: FileSystemProvider, path: string | URL): Promise<CryptoKey | null>
    {
        return fs.readFile(path + '.key').then(keyContent => subtle.importKey('raw', keyContent.toArray(), { name: 'AES-CBC' }, true, ['encrypt', 'decrypt']), () => undefined);
    }

    public get<TResult = string>(key?: string): ProxyConfiguration<TResult>
    public get<const TKey extends Exclude<keyof T, number | symbol>, TResult = T[TKey]>(key?: TKey): ProxyConfiguration<TResult>
    public get<const TKey extends string = Exclude<keyof T, number | symbol>, TResult = TKey extends keyof T ? T[TKey] : string>(key?: TKey): ProxyConfiguration<TResult>
    {
        if (key)
        {
            const value = key.split('.').reduce(function (config, key)
            {
                if (typeof (config) === 'undefined')
                    return config;
                return config[key];
            }, this.config);
            if (typeof value == 'object' && value && !Array.isArray(value))
            {
                const result = Configuration.new(this.fs, this.path, value as TResult & object, this.rootConfig, this.cryptKey);
                Object.defineProperty(result, 'cryptKey', {
                    get: () => this.cryptKey,
                    set: (value) => this.cryptKey = value
                });
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                return result as any;
            }
            return value;
        }
        else
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return this as any;
    }

    readonly [unwrap] = this;

    public async getSecret(key: string): Promise<string>
    {
        const self = this[unwrap];
        const secret = self.get<{ iv: string, value: string }>(key).extract();
        if (!self.cryptKey)
            if (self.path)
                self.cryptKey = await Configuration.loadKey(this.fs, self.path);
            else
                throw new ErrorWithStatus(HttpStatusCode.NotFound, 'No key was provided to read the secret ' + key);
        return aesDecrypt(base64.base64DecToArr(secret.value), self.cryptKey, base64.base64DecToArr(secret.iv));
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
        return keys.reduce(function (config, key, i)
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
        if (!self.cryptKey)
            if (self.path)
                self.cryptKey = await Configuration.loadKey(this.fs, self.path);
            else
                self.cryptKey = await generateAesKey();
        const secret = await aesEncrypt(newConfig, self.cryptKey);
        if (secret.key !== self.cryptKey)
            self.cryptKey = secret.key;
        self.set(key, { iv: base64.base64EncArr(secret.iv), value: base64.base64EncArr(new Uint8Array(secret.ciphertext)) });
    }

    public delete(key: Exclude<keyof T, symbol | number>): void
    public delete(key: string): void
    public delete(key: string | Exclude<keyof T, symbol | number>): void
    public delete(key: string | Exclude<keyof T, symbol | number>): void
    {
        const keys = key.split('.');
        return keys.reduce(function (config, key, i)
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
        await this.fs.writeFile(file || self.path, JSON.stringify(self.rootConfig, null, formatted && 4 || undefined));
        if (self.cryptKey)
            await this.fs.writeFile((file || self.path) + '.key', await subtle.exportKey('raw', self.cryptKey), { mode: 0o700 });

    }
}
