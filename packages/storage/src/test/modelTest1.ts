import * as db from '../server/index.js'
import 'reflect-metadata'

@db.Model
export class ModelTest1
{
    @db.Key(db.Types.string)
    public s1: string;

    private _s2: string;
    public get s2(): string
    {
        return this._s2;
    }
    @db.Field
    public set s2(v: string)
    {
        this._s2 = v;
    }

    @db.Field
    public d: Date;
}

