import { providers } from "@akala/storage";
import { MongoClient } from "mongodb";
import { MongoDb } from "./persistenceengine.js";

export default function ()
{

    providers.useProtocol('mongodb', async url =>
    {
        const client = new MongoClient(new URL('/', url).toString(), url.searchParams ? Object.fromEntries(url.searchParams.entries()) : undefined);
        const db = client.db(url.pathname.substring(1));

        const pe = new MongoDb();
        await pe.init(db);
        return pe;
    })

}
