import { BinaryOperator } from "@akala/core/expressions";
import { type State } from "../state.js";
import { validateSessionOwner } from "./login.js";
import { Session } from "../../model/session.js";
import { logger } from "@akala/core";

const log = logger.use('akala:auth:whoami');

export default async function (this: State, trigger: string, sessionId: string, sessionSignature: string)
{
    log.debug(arguments);
    let session: Session;
    if (trigger == 'jsonrpc')
        session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();
    else
        session = await validateSessionOwner(this, sessionId, sessionSignature);

    const user = await this.store.User.where('id', BinaryOperator.Equal, session.userId).firstOrDefault()

    return { attributes: user.attributes, name: user.name }
}
