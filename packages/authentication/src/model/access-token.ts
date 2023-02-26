import * as db from '@akala/storage'
import { v4 as uuid } from 'uuid';

@db.Model
export class Token
{
    constructor()
    {
        this.token = uuid();
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
}