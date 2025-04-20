import { Container } from "@akala/commands";
import { State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { providers } from "@akala/storage";
// import { webcrypto as crypto } from "crypto";
import { base64 } from '@akala/core'
import { readFile } from "fs/promises";
import { HttpRouter } from "@akala/server";
import { AuthorizeRedirectFormatter } from "../middlewares/AuthorizeRedirectFormatter.js";

export default async function (this: State, container: Container<State>, providerName: string, keyPath: string, loginUrl: string, router?: HttpRouter)
{
    // console.log(arguments);
    container.state = this;
    const provider = await providers.process(new URL(providerName))

    this.store = await AuthenticationStore.create(provider);

    const cryptoKey = this.cryptoKey = keyPath ? await crypto.subtle.importKey('raw', await readFile(keyPath), { name: 'HMAC', hash: 'SHA-256' }, false, ["sign", 'verify']) : await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    this.getHash = async (value: string, salt?: ArrayBuffer) => base64.base64EncArr(await crypto.subtle.sign('HMAC', cryptoKey, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value)));
    this.verifyHash = async (value: string, signature: BufferSource, salt?: ArrayBuffer) => await crypto.subtle.verify('HMAC', cryptoKey, signature, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value));
    this.session = { slidingExpiration: 300 };

    router?.formatters.useMiddleware(1, new AuthorizeRedirectFormatter(loginUrl, 'return_url'))
}
