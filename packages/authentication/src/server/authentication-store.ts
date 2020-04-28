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

    [key: string]: DbSet<any>;
    public static async create(engine?: PersistenceEngine<any>)
    {
        if (!engine)
            engine = await provider;
        return Store.create<AuthenticationStore>(engine, 'AuthorizationCode', 'AccessToken', 'Client', 'User');
    }
}

export var provider = akala.injectWithNameAsync(['$config.@akala-modules/authentication.storage.provider', '$config.@akala-modules/authentication.storage.options'], async function (providerConfig, options)
{
    var provider = new (providers.resolve<new () => PersistenceEngine<any>>(providerConfig));
    await provider.init(options);

    return provider;
})

