import * as db from '@akala/storage'
import { Generator } from '@akala/storage';

@db.Model
export class User
{
    @db.Key(db.Types.string(36), Generator.uuid)
    id?: string;
    @db.Field(db.Types.string(50))
    name: string;
    @db.Field(db.Types.string(36))
    password: string;
    @db.Field(db.Types.string(36))
    salt: string;
    @db.Field(db.Types.string)
    attributes: Record<string, { value: string | number | boolean, canBeValidated: boolean, validated: boolean }>;
}