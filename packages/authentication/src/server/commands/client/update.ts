import { State } from "../../state.js";
import { base64 } from '@akala/core'
import { BinaryOperator } from '@akala/core/expressions'
import { Client } from "../../../model/client.js";

export default async function (this: State, id: string, clientUpdate: Partial<Omit<Client, 'id' | 'clientSecret' | 'signedClientSecret'>>)
{
    const client = await this.store.Client.where('id', BinaryOperator.Equal, id).firstOrDefault()
    await this.store.Client.updateSingle({
        ...client,
        isTrusted: typeof clientUpdate.isTrusted == 'undefined' ? client.isTrusted : clientUpdate.isTrusted,
        name: typeof clientUpdate.name == 'undefined' ? client.name : clientUpdate.name,
        redirectUri: typeof clientUpdate.redirectUri == 'undefined' ? client.redirectUri : clientUpdate.redirectUri,
        scope: typeof clientUpdate.scope == 'undefined' ? client.scope : clientUpdate.scope,
    })
} 