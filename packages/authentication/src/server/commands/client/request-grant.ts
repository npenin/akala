import { BinaryOperator } from "@akala/core/expressions";
import { randomUUID } from "crypto";
import { State } from "../../state.js";
import { Token } from "../../../model/access-token.js";
import { ErrorWithStatus, HttpStatusCode, base64 } from "@akala/core";
import { Client } from "../../../model/client.js";

export async function validateClient(client: Client, clientSecret: string)
{
    if (!client)
        throw new ErrorWithStatus(HttpStatusCode.Unauthorized, 'invalid_client')
    if (client.signedClientSecret)
    {
        if (client.clientSecret != base64.base64EncArr(new Uint8Array(await crypto.subtle.digest('SHA-256', base64.base64DecToArr(clientSecret)))))
            throw new ErrorWithStatus(HttpStatusCode.Unauthorized, 'invalid_client')
    }
    else if (client.clientSecret != clientSecret)
        throw new ErrorWithStatus(HttpStatusCode.Unauthorized, 'invalid_client')
}


export default async function (this: State, clientId: string, clientSecret: string, sessionId: string, scope: string[], expiresOn?: Date | string)
{
    const client = await this.store.Client.where('id', BinaryOperator.Equal, clientId).firstOrDefault();
    await validateClient(client, clientSecret);

    const session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    const token = new Token();

    token.userId = session.userId;
    token.scope = scope;
    token.token = randomUUID();
    token.createdOn = new Date();
    token.clientId = clientId;
    token.expiresOn = typeof expiresOn == 'string' ? new Date(expiresOn) : expiresOn;

    await this.store.Token.createSingle(token);

    return token.token;
}