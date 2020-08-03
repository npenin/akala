import * as akala from '@akala/core'
import * as web from '@akala/server'
import * as oauth2orize from 'oauth2orize'
import { AuthorizationCode } from '../model/authorization-code';
import { expressions } from '@akala/storage';
import { AuthenticationStore } from './authentication-store'
import * as uuid from 'uuid'
import { Client } from '../model/client';
import { User } from '../model/user';
import { AccessToken } from '../model/access-token';
import * as passport from 'passport'
import { ensureLoggedIn } from 'connect-ensure-login'
import { promises as fs } from 'fs';



import { Strategy as LocalStrategy } from 'passport-local';
import { BasicStrategy } from 'passport-http';
import { Strategy as ClientPasswordStrategy } from 'passport-oauth2-client-password';
import { Strategy as BearerStrategy } from 'passport-http-bearer';
import * as crypto from 'crypto'
import bodyParser = require('body-parser');
import '../model/authorization-code';
import '../model/access-token';
import '../model/client';
import '../model/user';
import { resolve } from 'path';

var hash = akala.defaultInjector.injectWithNameAsync(['$config.@akala-modules/authentication.secret'], function (secret)
{
    return function hash(s: string)
    {
        var hash = crypto.createHmac('sha256', secret || 'pwet');
        hash.update(s);
        return hash.digest('hex');
    }

});

function tryAuthenticate(strategy)
{
    return web.master.expressWrap(function (req, res, next)
    {
        passport.authenticate(strategy, { session: false },
            function (error, user)
            {
                if (error)
                    next(error);
                else if (user)
                    req['login'](user, { session: false }, function ()
                    {
                        next();
                    });
                else
                    next();
            })(req, res, next);
    })
}

passport.serializeUser((user: User | Client, done) => done(null, user.id));

passport.deserializeUser(async (id: string, done) =>
{
    var store = await AuthenticationStore.create();
    try
    {
        var user = await store.User.where('id', expressions.BinaryOperator.Equal, id).firstOrDefault();
        done(null, user);
    }
    catch (error)
    {
        done(error);
    }
});

var authenticationMethods: { [key: string]: web.HttpRouter } = {};
var auth = web.router();

auth.use(bodyParser.json())
auth.use(bodyParser.urlencoded())

auth.post('/api/login/:provider', function (req, res, next)
{
    if (!authenticationMethods[req.params.provider])
    {
        authenticationMethods[req.params.provider] = new web.HttpRouter();
        authenticationMethods[req.params.provider].use(passport.authenticate(req.params.provider, { successReturnToOrRedirect: '/', failureRedirect: '/login.html', session: false }, function (err, account)
        {
            if (err)
                next(err);
            else
            {
                req['body'].grant_type = 'password';
                server.token()(req, res, next);
            }
        }));
    }
    authenticationMethods[req.params.provider].handle(req, res, next);
});

var server = oauth2orize.createServer();

server.serializeClient((client, done) => done(null, client.id));

server.deserializeClient(async (id, done) =>
{
    try
    {
        var store = await AuthenticationStore.create();
        done(null, await store.User.where('id', expressions.BinaryOperator.Equal, id));
    }
    catch (e)
    {
        done(e);
    }
});

passport.use('local', new LocalStrategy({ session: false },
    async (username, password, done) =>
    {
        var store = await AuthenticationStore.create();

        try
        {
            var user = await store.User.where('name', expressions.BinaryOperator.Equal, username).firstOrDefault();
            if (!user)
            {
                if (!await store.User.any())
                {
                    user = await akala.defaultInjector.resolveAsync<User>('$config.@akala-modules/authentication.default');
                    if (!user)
                    {
                        user = { name: 'admin', displayName: 'Admin', password: (await hash)('admin') };
                    }
                    await store.User.createSingle(user);
                }
                else
                    return done(null, false);

            }
            if (await user.password !== (await hash)(password))
                return done(null, false);
            return done(null, user);
        }
        catch (e)
        {
            done(e);
        }
    }
));

async function verifyClient(clientId, clientSecret, done)
{
    debugger;
    var store = await AuthenticationStore.create();

    try
    {
        var client = await store.Client.where('id', expressions.BinaryOperator.Equal, clientId).firstOrDefault();
        if (!client) return done(null, false);
        if (client.clientSecret !== clientSecret) return done(null, false);
        return done(null, client);
    }
    catch (e)
    {
        done(e);
    }
}

passport.use('basic', new BasicStrategy(verifyClient));

passport.use('oauth', new ClientPasswordStrategy(verifyClient));

passport.use('bearer', new BearerStrategy(
    async (accessToken: string, done) =>
    {
        var store = await AuthenticationStore.create();
        try
        {
            var token = await store.AccessToken.where('token', expressions.BinaryOperator.Equal, accessToken).firstOrDefault();
            if (!token) return done(null, false);
            if (token.userId)
            {
                var user = await store.User.where('id', expressions.BinaryOperator.Equal, token.userId).firstOrDefault();
                if (!user)
                    return done(null, false);
                done(null, user, { message: 'welcome user', scope: '*' });
                // To keep this example simple, restricted scopes are not implemented,
                // and this is just for illustrative purposes.
            } else
            {
                // The request came from a client only since userId is null,
                // therefore the client is passed back instead of a user.

                var client = await store.Client.where('id', expressions.BinaryOperator.Equal, token.clientId).firstOrDefault();
                if (!client) return done(null, false);
                // To keep this example simple, restricted scopes are not implemented,
                // and this is just for illustrative purposes.
                done(null, client, { message: 'welcome client', scope: '*' });
            }
        }
        catch (e)
        {
            done(e);
        }
    }
));

server.grant(oauth2orize.grant.code(async function (client: Client, redirectURI, user: User, ares: { scope: string }, done)
{
    try
    {
        var store = await AuthenticationStore.create();
        var code = uuid.v4();

        var ac = Object.assign(new AuthorizationCode, { code, clientId: client.id, redirectURI, userId: user.id, scope: ares.scope });

        await store.AuthorizationCode.createSingle(ac);
        done(null, code);
    }
    catch (e)
    {
        done(e);
    }
}));

server.exchange(oauth2orize.exchange.code(async function (client, code, redirectURI, done)
{
    try
    {
        var store = await AuthenticationStore.create();
        var authCode = await store.AuthorizationCode.where('code', expressions.BinaryOperator.Equal, code).firstOrDefault();


        if (client.id !== authCode.clientId)
            return done(null, false);
        if (redirectURI !== authCode.redirectURI)
            return done(null, false);

        var token = uuid.v4();
        var at = Object.assign(new AccessToken, { token, userId: authCode.userId, clientId: authCode.clientId, scope: authCode.scope });

        await store.AccessToken.createSingle(at);

        done(null, token);
    }
    catch (e)
    {
        done(e);
    }
}));

server.exchange(oauth2orize.exchange.password(async (client: Client, username: string, password: string, scope: string[], done) =>
{
    var store = await AuthenticationStore.create();
    // Validate the client
    if (typeof (client.id) !== 'undefined' || !client.isTrusted || client.name !== 'self')
    {
        var localClient = await store.Client.where('id', expressions.BinaryOperator.Equal, client.id).firstOrDefault()

        if (!localClient)
            return done(null, false);
        if (await localClient.clientSecret !== client.clientSecret)
            return done(null, false);
    }
    // Validate the user
    var user = await store.User.where('name', expressions.BinaryOperator.Equal, username).firstOrDefault()

    if (!user) return done(null, false);
    if ((await hash)(password) !== user.password) return done(null, false);
    // Everything validated, return the token
    var token = new AccessToken();
    token.userId = user.id;
    token.clientId = client.id;
    token.scope = scope;

    await store.AccessToken.createSingle(token);

    done(null, token.token);
}));

export var authorization =
    server.authorization(async (clientId, redirectUri, done) =>
    {
        var store = await AuthenticationStore.create();
        var client = await store.Client.where('id', expressions.BinaryOperator.Equal, clientId).firstOrDefault();

        if (!client) return done(new Error('Client not found'));
        // WARNING: For security purposes, it is highly advisable to check that
        //          redirectUri provided by the client matches one registered with
        //          the server. For simplicity, this example does not. You have
        //          been warned.
        if (!await store.AuthorizationCode.where('clientId', expressions.BinaryOperator.Equal, client.id).where('redirectURI', expressions.BinaryOperator.Equal, redirectUri).any())
            return done(new Error('Not client is matching'));

        return done(null, client, redirectUri);
    }, async (client: Client, user: User, scope, type, done: (error: Error, canHaveToken: boolean) => void) =>
    {
        // Check if grant request qualifies for immediate approval

        // Auto-approve
        if (client.isTrusted)
            return done(null, true);

        var store = await AuthenticationStore.create();
        var token = await store.AccessToken.where('clientId', expressions.BinaryOperator.Equal, client.id).where('userId', expressions.BinaryOperator.Equal, user.id)
        // Auto-approve
        if (token)
            return done(null, true);

        // Otherwise ask user
        return done(null, false);
    });

export var decision = server.decision();
export var token = server.token();
export var errorHandler = server.errorHandler();
// export var api = new akala.Api()
//     .clientToServerOneWay<{ name: string, displayName: string }>()({ registerClient: { rest: { path: '/api/auth/client', method: 'post' } } })

var ready = false;

akala.module('@akala-modules/authentication').activate(['$authenticationRouter', '$injector'],
    async function init(router: web.HttpRouter)
    {
        var store = await AuthenticationStore.create();
        if (!await store.Client.where('name', expressions.BinaryOperator.Equal, 'self').any())
        {
            var client = new Client();
            client.id = uuid.v4();
            client.clientSecret = (await hash)(Math.random().toString(2));
            client.name = 'self';
            await store.Client.createSingle(client);
            var at = new AccessToken();
            at.clientId = client.id;
            at.token = uuid.v4();
            await store.AccessToken.createSingle(at);
            await fs.writeFile(resolve(process.cwd(), './local-token.json'), at.token, 'utf8')
        }

        router.use(web.master.expressWrap(passport.initialize()));

        router.use(tryAuthenticate('basic'))
        router.use(tryAuthenticate('bearer'))

        router.post('/api/token', bodyParser.json(), bodyParser.urlencoded(), server.token(), web.master.expressWrapError(server.errorHandler()));
        router.get('/api/authorize', web.master.expressWrap(ensureLoggedIn()),
            server.authorize(async function (clientID, redirectURI, done)
            {
                var store = await AuthenticationStore.create();
                var client = await store.Client.where('id', expressions.BinaryOperator.Equal, clientID).firstOrDefault()
                if (!client)
                    return done(null, false);
                if (client.redirectUri != redirectURI)
                    return done(null, false);
                return done(null, client, client.redirectUri);
            }),
            function (req: web.master.Request, res: web.master.Response)
            {
                res.json({
                    transactionID: req['oauth2'].transactionID,
                    user: req['user'], client: req['oauth2'].client
                });
            });

        router.post('/api/authorize', bodyParser.json(), bodyParser.urlencoded(), web.master.expressWrap(ensureLoggedIn()), web.master.expressWrap(server.decision()));

        // router.post('/api/login/:provider', auth.router);
        router.post('/api/login', bodyParser.json(), bodyParser.urlencoded(), function (req: web.Request & { user?: Client }, res, next)
        {
            req.user = new Client();
            req.user.isTrusted = true;
            req.user.name = 'self';
            req['body'].grant_type = 'password';
            server.token()(req, res, next);
        });

        router.use(function (req, res, ...next: akala.NextFunction[])
        {
            if (!ready)
                if (req.socket.remoteAddress != '::1' && req.socket.remoteAddress != '127.0.0.1')
                    res.sendStatus(503);
                else
                    next[next.length - 1]();
            else if (arguments.length == 3)
                if (!req.user)
                    if (req.url.startsWith('/api'))
                        res.sendStatus(401);
                    else
                        res.redirect('/login.html')
                else
                    next[next.length - 1]();
            else
                if (!req.user)
                    next[next.length - 1](new Error('Not authorized'));
                else
                    next[next.length - 1]();
        });
    })

akala.module('@akala-modules/authentication').ready([], function ()
{
    ready = true;
})
