import { Container, Processors } from "@akala/commands";
import { State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { providers, Query } from "@akala/storage";
// import { webcrypto as crypto } from "crypto";
import { base64 } from '@akala/core'
import { readFile, writeFile } from "fs/promises";
import { HttpRouter } from "@akala/server";
import { AuthorizeRedirectFormatter } from "../middlewares/AuthorizeRedirectFormatter.js";
import { User } from "../../model/user.js";

export default async function (this: State, container: Container<State>, providerName: string, keyPath: string, loginUrl: string, router?: HttpRouter)
{
    // console.log(arguments);
    container.state = this;
    const provider = await providers.process(new URL(providerName))

    this.store = await AuthenticationStore.create(provider);

    let key: BufferSource;
    try
    {
        key = await readFile(keyPath);
    }
    catch (e)
    {
        if (e.code == 'ENOENT')
        {
            const cryptoKey = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
            key = await crypto.subtle.exportKey('raw', cryptoKey);
            await writeFile(keyPath, new DataView(key))
        }
    }

    if (!key)
        console.warn('a temporary key will be generated. That means that entries created with that key will not be valid on the next run. If you want to persist the key, please specify the `keyPath` in the config');

    const cryptoKey = this.cryptoKey = key ? await crypto.subtle.importKey('raw', key, { name: 'HMAC', hash: 'SHA-256' }, false, ["sign", 'verify']) : await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    this.getHash = async (value: string, salt?: Uint8Array) => base64.base64EncArrBuff(await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, cryptoKey, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value)));
    this.verifyHash = async (value: string, signature: Uint8Array, salt?: Uint8Array) => await crypto.subtle.verify({ name: 'HMAC', hash: 'SHA-256' }, cryptoKey, signature, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value));
    this.session = { slidingExpiration: 300 };

    router?.formatters.useMiddleware(1, new AuthorizeRedirectFormatter(loginUrl, 'return_url'))

    container.processor.useMiddleware(6, new Processors.AuthHandler(async (userQ: Query<User>, password: string) =>
    {
        const user = await userQ.firstOrDefault();

        if (user && await this.verifyHash(password, base64.base64DecToArr(user.password), base64.base64DecToArr(user.salt)))
            return user;

    }))

}
