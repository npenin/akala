import { ErrorWithStatus, base64 } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";
import addSession from "./session/add-session.js";

export default async function (this: State, username: string, password: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, username).firstOrDefault();

    if (!user)
        throw new ErrorWithStatus(401, 'Invalid Username (or password).');

    if (!await this.verifyHash(password, base64.base64DecToArr(user.password), base64.base64DecToArr(user.salt)))
        throw new ErrorWithStatus(401, 'Invalid (Username or) password).');

    const session = await addSession.call(this, null, user.id);

    session.userId = user.id;

    return { id: user.id, sessionId: session.id, sessionSignature: this.getHash(user.salt + session.id), username: user.name }
}