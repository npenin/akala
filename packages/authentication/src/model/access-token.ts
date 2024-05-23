import * as db from '@akala/storage'

@db.Model
export class Token
{
    constructor()
    {
        this.token = crypto.randomUUID();
    }

    @db.Key(db.Types.string(36))
    public token: string;
    @db.Key(db.Types.string(20))
    public tokenType: string;
    @db.Field(db.Types.string(36))
    public clientId: string;
    @db.Field(db.Types.string(36))
    public userId: string;
    @db.Field(db.Types.string(250))
    public scope: string[];
    @db.Field(db.Types.datetime)
    public expiresOn?: Date;
    @db.Field(db.Types.datetime)
    public createdOn?: Date;
}