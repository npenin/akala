import * as db from '@akala/storage'

@db.Model
export class AuthorizationCode
{
    @db.Key(db.Types.string(36))
    public code: string;
    @db.Field(db.Types.string(50))
    public clientId: string;
    @db.Field(db.Types.string(1024))
    public redirectURI: string;
    @db.Field(db.Types.string(50))
    public userId: string;
    @db.Field(db.Types.string(50))
    public scope: string;
}