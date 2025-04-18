import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import userInfo from '../../server/oidc-server/userinfo.js';
import logout from '../../server/oidc-server/remove-token.js';
import introspect from '../../server/oidc-server/introspect.js';
// import getKeys from '../../server/oidc-server/get-keys.js';
import authorize from '../../server/oidc-server/authorize.js';
import { HttpRouter } from '@akala/server';
import { Store, Vanilla } from '@akala/storage';
import { AuthenticationStore } from '../../server/authentication-store.js';
import { OIDCResponseType } from '../../client/oidc-state.js';
import { BinaryOperator } from '@akala/core/expressions';
import { Token } from '../../model/access-token.js';
import { User } from '../../model/user.js';
import { Client } from '../../model/client.js';
import { AuthorizationCode } from '../../model/authorization-code.js';
import { Session } from '../../model/session.js';


describe('OIDC Operations', () =>
{
    const engine = new Vanilla();
    // Mock State and Store
    const mockState = {
        router: new HttpRouter(),
        cryptoKey: null,
        getHash: async () => 'mockHash',
        verifyHash: async () => true,
        session: {},
        store: Store.create<AuthenticationStore>(engine, Token, User, Client, AuthorizationCode, Session)
    };
    let user: User;
    let client: Client;

    before(async () =>
    {
        await engine.init();
        const transaction = engine.beginTransaction();
        transaction.enlist(mockState.store.Client.create(client = {
            id: 'client1',
            name: 'Test Client',
            redirectUris: ['http://localhost/callback'],
            scope: 'openid profile email',
            clientSecret: 'secret',
            signedClientSecret: false,
            isTrusted: true
        }));

        transaction.enlist(mockState.store.User.create(user = {
            id: 'user1',
            name: 'Test User',
            password: 'hashedPassword',
            salt: 'randomSalt',
            disabled: false,
            attributes: {
                email: {
                    validated: true,
                    canBeValidated: true,
                    value: 'email@example.com'
                }
            }
        }));

        await engine.commitTransaction(transaction);
    })

    it('should retrieve user info', async () =>
    {
        await mockState.store.Token.createSingle({
            clientId: client.id,
            userId: user.id,
            token: 'validAccessToken',
            expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
            scope: ['openid', 'profile', 'email'],
            createdOn: new Date(),
            tokenType: 'access_token',
        });

        const result = await userInfo.call(mockState, 'validAccessToken');
        assert.deepStrictEqual(result, {
            sub: user.id,
            name: user.name,
            email: user.attributes.email.value,
            email_verified: user.attributes.email.validated,
        });
    });

    it('should log out the user', async () =>
    {
        await mockState.store.Token.createSingle({
            clientId: 'client1',
            userId: 'user1',
            token: 'validLogoutToken',
            expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
            scope: ['openid', 'profile', 'email'],
            createdOn: new Date(),
            tokenType: 'access_token',
        });

        await logout.call(mockState, 'validLogoutToken');
    });

    it('should introspect a token', async () =>
    {
        await mockState.store.Token.createSingle({
            clientId: 'client1',
            userId: 'user1',
            token: 'validAccessToken',
            expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour expiration
            scope: ['openid', 'profile', 'email'],
            createdOn: new Date(),
            tokenType: 'access_token',
        });

        const token = await mockState.store.Token.where('token', BinaryOperator.Equal, 'validAccessToken').firstOrDefault();
        const result = await introspect.call(mockState, 'validAccessToken');
        assert.deepStrictEqual(result, {
            active: true,
            sub: token.userId,
            exp: token.expiresOn,
            scope: token.scope,
            client_id: token.clientId,
        });
    });

    // it('should retrieve keys', async () =>
    // {
    //     const result = await getKeys.call(mockState);
    //     assert.deepStrictEqual(result, {
    //         keys: [
    //             {
    //                 kty: 'RSA',
    //                 use: 'sig',
    //                 kid: 'key1',
    //                 alg: 'RS256',
    //                 n: 'modulus',
    //                 e: 'exponent',
    //             },
    //         ],
    //     });
    // });

    // Adding a mock User object to match the expected argument type for the authorize function
    it('should authorize a client', async () =>
    {
        const mockUser = {
            id: 'user1',
            name: 'Test User',
            email: 'test@example.com',
            password: 'hashedPassword',
            salt: 'randomSalt',
            disabled: false,
            attributes: {}, // Adding the missing 'attributes' property
        };

        const result = await authorize.call(mockState, mockUser, 'openid', OIDCResponseType.Code, 'client1', 'http://localhost/callback', 'state123');
        assert.strictEqual(typeof result, 'string'); // Verifying that the result is a string
        assert.ok(result.includes('state123')); // Checking if the result contains the state parameter
    });
});
