import { sidecar } from "@akala/pm";
import { ExchangeMiddleware, OAuthError } from "../index.js";
import { BinaryOperator } from "@akala/core/expressions";
import { Token } from "../../model/access-token.js";
import { HttpRouter } from "@akala/server";
import { Container, Processors } from "@akala/commands";
import { type State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { providers, Query } from "@akala/storage";
// import { webcrypto as crypto } from "crypto";
import { base64, HttpStatusCode, IsomorphicBuffer } from '@akala/core'
import { AuthorizeRedirectFormatter } from "../middlewares/AuthorizeRedirectFormatter.js";
import { User } from "../../model/user.js";
import { type ProxyConfiguration } from '@akala/config';
import fsHandler from "@akala/fs";
import { pathToFileURL } from "url";

export default async function (this: State, config: ProxyConfiguration<{ provider: string, loginUrl: string, keyPath: string }>, container: Container<State>, providerName: string, keyPath: string, loginUrl: string, router?: HttpRouter)
{
    // console.log(arguments);
    container.state = this;
    const provider = await providers.process(new URL(providerName || config.provider))

    const fs = await fsHandler.process(pathToFileURL(process.cwd() + '/'));
    const store = this.store = await AuthenticationStore.create(provider);
    // this.session = { slidingExpiration: 30 };

    let key: IsomorphicBuffer;
    try
    {
        key = await fs.readFile(keyPath || config.keyPath);
    }
    catch (e)
    {
        if (e.statusCode === HttpStatusCode.NotFound)
        {
            const cryptoKey = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, ['sign', 'verify']);
            key = IsomorphicBuffer.fromArrayBuffer(await crypto.subtle.exportKey('raw', cryptoKey));
            await fs.writeFile(keyPath, key)
        }
        else
            console.error(e);
    }

    if (!key)
        console.warn('a temporary key will be generated. That means that entries created with that key will not be valid on the next run. If you want to persist the key, please specify the `keyPath` in the config');

    const cryptoKey = this.cryptoKey = key ? await crypto.subtle.importKey('raw', key.toArray(), { name: 'HMAC', hash: 'SHA-256' }, false, ["sign", 'verify']) : await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);

    this.getHash = async (value: string, salt?: Uint8Array) => base64.base64EncArrBuff(await crypto.subtle.sign({ name: 'HMAC', hash: 'SHA-256' }, cryptoKey, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value)));
    this.verifyHash = async (value: string, signature: Uint8Array, salt?: Uint8Array) => await crypto.subtle.verify({ name: 'HMAC', hash: 'SHA-256' }, cryptoKey, signature, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value));
    this.session = { slidingExpiration: 300000 };

    router?.formatters.useMiddleware(1, new AuthorizeRedirectFormatter(loginUrl || config.loginUrl, 'return_url'))

    container.processor.useMiddleware(6, new Processors.AuthHandler(async (userQ: Query<User>, password: string) =>
    {
        const user = await userQ.firstOrDefault();

        if (user && await this.verifyHash(password, base64.base64DecToArr(user.password), base64.base64DecToArr(user.salt)))
            return user;
    }))

    ExchangeMiddleware.register('code', async (code, clientId, req) =>
    {
        const authCode = await store.AuthorizationCode.where('code', BinaryOperator.Equal, code).where('clientId', BinaryOperator.Equal, clientId).firstOrDefault();
        if (!authCode)
            throw new OAuthError("invalid_grant");
    }, async (code, clientId, req) =>
    {
        const authCode = await store.AuthorizationCode.where('code', BinaryOperator.Equal, code).where('clientId', BinaryOperator.Equal, clientId).firstOrDefault();
        if (!authCode)
            throw new OAuthError("invalid_grant");
        const token = new Token();
        token.tokenType = 'access';
        token.token = crypto.randomUUID();
        token.clientId = clientId;
        token.scope = req.query.getAll('scope');
        token.userId = authCode.userId;
        token.expiresOn = new Date();
        token.expiresOn.setHours(token.expiresOn.getHours() + 1);
        await store.Token.createSingle(token);
        return { access_token: token.token, scope: token.scope, token_type: 'Bearer', refresh_token: await ExchangeMiddleware.grants['refresh_token'].process(null, clientId, req) as string };
    });

    ExchangeMiddleware.register('refresh_token', async (code, clientId, req) =>
    {
        if (code === null)
            return;
        const token = await store.Token.where('token', BinaryOperator.Equal, code).where('clientId', BinaryOperator.Equal, clientId).firstOrDefault();
        if (!token || token.tokenType != 'refresh')
            throw new OAuthError("invalid_grant");
    }, async (code, clientId, req) =>
    {
        const authCode = await store.Token.where('token', BinaryOperator.Equal, code).where('clientId', BinaryOperator.Equal, clientId).firstOrDefault();
        if (!authCode)
            throw new OAuthError("invalid_grant");
        const token = new Token();
        token.tokenType = 'refresh';
        token.token = crypto.randomUUID();
        token.clientId = clientId;
        token.scope = req.query.getAll('scope');
        token.userId = authCode.userId;
        token.expiresOn = new Date();
        token.expiresOn.setFullYear(token.expiresOn.getFullYear() + 1);
        await store.Token.createSingle(token);
        return { access_token: token.token, scope: token.scope, token_type: 'refresh', expires_in: (token.expiresOn.valueOf() - new Date().valueOf()) / 1000 };
    });

    container.state.router = new HttpRouter();

    const containers = sidecar();
    if (!containers)
        return;
    const server = (await containers['@akala/server']);

    // server.dispatch('remote-route', '/.well-known/openid-configuration', null, { pre: true, get: true });
    const remote = await server?.dispatch('remote-route', '/', { auth: true, use: true });
    remote;
}
