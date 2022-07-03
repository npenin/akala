import { DbSet, StoreDefinition, PersistenceEngine, Store } from '@akala/storage';
import { AuthorizationCode } from '../model/authorization-code';
import { AccessToken } from '../model/access-token';
import { Client } from '../model/client';
import { User } from '../model/user';
import * as akala from '@akala/core';
import { providers } from '@akala/storage';

export class AuthenticationStore implements StoreDefinition
{
    AuthorizationCode: DbSet<AuthorizationCode>;
    AccessToken: DbSet<AccessToken>;
    Client: DbSet<Client>;
    User: DbSet<User>;

    public static async create(engine?: PersistenceEngine<unknown>)
    {
        if (!engine)
            engine = await provider;
        return Store.create<AuthenticationStore>(engine, 'AuthorizationCode', 'AccessToken', 'Client', 'User');
    }
}

export var provider = akala.defaultInjector.injectWithNameAsync(['$config.@akala-modules/authentication.storage.provider', '$config.@akala-modules/authentication.storage.options'], async function (providerConfig: string, options)
{
    const provider = new (providers.resolve<new () => PersistenceEngine<unknown>>(providerConfig));
    await provider.init(options);

    return provider;
})

