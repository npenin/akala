import * as db from '@akala/storage'

@db.Model
export class Client
{
    @db.Field(db.Types.string(20))
    name: string;
    @db.Key(db.Types.string(36))
    id: string;
    @db.Field(db.Types.string(50))
    clientSecret: string;
    @db.Field(db.Types.string(2048))
    redirectUri: string;
    @db.Field(db.Types.boolean)
    isTrusted: boolean;
}