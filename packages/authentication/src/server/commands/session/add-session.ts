import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";
import { AuthenticationMethodReference, Session } from "../../../model/session.js";

export default async function (this: State, deviceId: string, userId: string, expiresOn?: Date, authenticationMethod?: AuthenticationMethodReference)
{
    let session = await this.store.Session.where('userId', BinaryOperator.Equal, userId).where('deviceId', BinaryOperator.Equal, deviceId).firstOrDefault();
    if (session && session.expiresOn > new Date())
    {
        //already valid existing session
        return session;
    }
    else
        session = {
            authenticationMethod: authenticationMethod,
            id: crypto.randomUUID(),
            userId: userId,
            deviceId: deviceId,
            createdOn: new Date(),
            expiresOn: expiresOn,
        }
    // token.userId = user.id;
    // token.scope = scope;
    // token.token = randomUUID();
    // token.createdOn = new Date();
    // token.clientId = clientId;
    // token.expiresOn = typeof expiresOn == 'string' ? new Date(expiresOn) : expiresOn;

    await this.store.Session.createSingle(session);
    return session;
}