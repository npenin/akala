import { State } from "../../state.js";
import { base64 } from '@akala/core'
import { BinaryOperator } from '@akala/core/expressions'

export async function generateSecret()
{
    const secret = new Uint8Array(256);
    crypto.getRandomValues(secret);
    return { signedSecret: base64.base64EncArr(new Uint8Array(await crypto.subtle.digest('SHA-256', secret))), base64EncodedSecret: base64.base64EncArr(secret), secret };
}

export default async function (this: State, id: string, sign?: boolean)
{
    const client = await this.store.Client.where('id', BinaryOperator.Equal, id).firstOrDefault();
    const newSecret = await generateSecret();
    if (sign || typeof sign == 'boolean' && client.signedClientSecret)
    {
        await this.store.Client.updateSingle({
            ...client,
            clientSecret: newSecret.signedSecret,
            signedClientSecret: true,
        })
        return newSecret
    } else
        await this.store.Client.updateSingle({
            ...client,
            clientSecret: newSecret.base64EncodedSecret,
            signedClientSecret: false
        })
}