import { DbSet, StoreDefinition, PersistenceEngine, Store } from '@akala/storage';
import { AuthorizationCode } from '../model/authorization-code.js';
import { Token } from '../model/access-token.js';
import { Client } from '../model/client.js';
import { User } from '../model/user.js';

export class AuthenticationStore implements StoreDefinition
{
    AuthorizationCode: DbSet<AuthorizationCode>;
    Token: DbSet<Token>;
    Client: DbSet<Client>;
    User: DbSet<User>;

    public static async create(engine: PersistenceEngine<unknown>)
    {
        return Store.create<AuthenticationStore>(engine, 'AuthorizationCode', 'Token', 'Client', 'User');
    }
}