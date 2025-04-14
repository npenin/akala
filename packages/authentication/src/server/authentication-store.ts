import { DbSet, StoreDefinition, PersistenceEngine, Store } from '@akala/storage';
import { AuthorizationCode } from '../model/authorization-code.js';
import { Token } from '../model/access-token.js';
import { Client } from '../model/client.js';
import { User } from '../model/user.js';
import { Session } from '../model/session.js';
import { Request, Response } from '@akala/server';

export class AuthenticationStore implements StoreDefinition
{
    AuthorizationCode: DbSet<AuthorizationCode>;
    Token: DbSet<Token>;
    Client: DbSet<Client>;
    User: DbSet<User>;
    Session: DbSet<Session>;

    public static async create(engine: PersistenceEngine<unknown>)
    {
        return Store.create<AuthenticationStore>(engine, AuthorizationCode, Token, Client, User, Session);
    }
}

export interface IdStore<T = unknown>
{
    saveId(req: Request, res: Response, value: T): Promise<void>;
    getId(req: Request, res: Response): Promise<T>;
}

export interface IdSerializer<T = unknown>
{
    stringify(value: T): Promise<string>;
    parse(value: string): Promise<T>;
}
