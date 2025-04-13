import { Container } from "@akala/commands";
import { State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { PersistenceEngine, providers } from "@akala/storage";
// import { webcrypto as crypto } from "crypto";
import { sidecar } from "@akala/pm";
import { ExchangeMiddleware, OAuthError } from "../index.js";
import { BinaryOperator } from "@akala/core/expressions";
import { Token } from "../../model/access-token.js";
import { HttpRouter } from "@akala/server";
import { base64 } from '@akala/core'

export default async function (this: State, container: Container<State>, providerName: string, providerOptions: unknown, key: string)
{
    // console.log(arguments);
    const provider = providers.resolve<PersistenceEngine<unknown>>(providerName)
    await provider.init(providerOptions);

    const store = container.state.store = await AuthenticationStore.create(provider);
    const cryptoKey = await crypto.subtle.importKey('raw', base64.base64DecToArr(key), { name: 'HMAC', hash: 'SHA-256' }, false, ["sign", 'verify']);
    this.getHash = async (value: string, salt?: ArrayBuffer) => base64.base64EncArr(await crypto.subtle.sign('HMAC', cryptoKey, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value)));
    this.verifyHash = async (value: string, signature: BufferSource, salt?: ArrayBuffer) => await crypto.subtle.verify('HMAC', cryptoKey, signature, salt ? new Uint8Array([...new Uint8Array(salt), ...new Uint8Array(base64.strToUTF8Arr(value))]) : base64.strToUTF8Arr(value));
    this.session = { slidingExpiration: 300 };

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
    server.dispatch('remote-route', '/', container, { auth: true, use: true });
}
