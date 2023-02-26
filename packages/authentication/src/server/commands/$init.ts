import { Container } from "@akala/commands";
import { State } from '../state.js';
import { AuthenticationStore } from '../authentication-store.js';
import { PersistenceEngine, providers } from "@akala/storage";
import { createHmac, randomUUID } from "crypto";
import { sidecar } from "@akala/pm";
import { ExchangeMiddleware, OAuthError } from "../master.js";
import { BinaryOperator } from "@akala/core/expressions";
import { Token } from "../../model/access-token.js";
import { HttpRouter } from "@akala/server";

export default async function (container: Container<State>, providerName: string, providerOptions: unknown, key: string)
{
    const provider = new (providers.resolve<new () => PersistenceEngine<unknown>>(providerName));
    await provider.init(providerOptions);

    const store = container.state.store = await AuthenticationStore.create(provider);
    const hmac = createHmac('sha256', key);
    container.state.getHash = (value) => hmac.update(value).digest('base64');

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
        token.token = randomUUID();
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
        token.token = randomUUID();
        token.clientId = clientId;
        token.scope = req.query.getAll('scope');
        token.userId = authCode.userId;
        token.expiresOn = new Date();
        token.expiresOn.setFullYear(token.expiresOn.getFullYear() + 1);
        await store.Token.createSingle(token);
        return { access_token: token.token, scope: token.scope, token_type: 'refresh', expires_in: (token.expiresOn.valueOf() - new Date().valueOf()) / 1000 };
    });

    container.state.router = new HttpRouter();

    const server = (await sidecar()['@akala/server']);

    server.dispatch('remote-route', '/.well-known/openid-configuration', null, { pre: true, get: true });
    server.dispatch('remote-route', '/', container, { auth: true, use: true });
}