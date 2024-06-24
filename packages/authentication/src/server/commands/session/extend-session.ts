import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";

export default async function (this: State, sessionId: string, expiresOn?: Date | string)
{
    const session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    session.expiresOn = typeof expiresOn == 'string' ? new Date(expiresOn) : expiresOn;

    await this.store.Session.updateSingle(session);
    return session;
}