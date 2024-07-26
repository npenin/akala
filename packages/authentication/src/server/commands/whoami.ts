import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";
import { validateSessionOwner } from "./login.js";
import { Session } from "../../model/session.js";

export default async function (this: State, trigger: string, sessionId: string, sessionSignature: string)
{
    console.log(arguments);
    let session: Session;
    if (trigger != 'jsonrpc')
        session = await validateSessionOwner(this, sessionId, sessionSignature);
    else
        session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    const user = await this.store.User.where('id', BinaryOperator.Equal, session.userId).firstOrDefault()

    return { attributes: user.attributes, name: user.name }
}