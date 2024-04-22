import { ErrorWithStatus, base64 } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";
import addSession from "./session/add-session.js";

export default async function (this: State, username: string, password: string, deviceId?: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, username).firstOrDefault();

    if (!user)
        throw new ErrorWithStatus(401, 'Invalid Username (or password).');

    if (!await this.verifyHash(password, base64.base64DecToArr(user.password), base64.base64DecToArr(user.salt)))
        throw new ErrorWithStatus(401, 'Invalid (Username or) password).');

    if (user.disabled)
        throw new ErrorWithStatus(409, 'The user is disabled');

    const session = await addSession.call(this, null, user.id);

    session.userId = user.id;

    return { id: user.id, sessionId: session.id, sessionSignature: this.getHash(session.id, base64.base64DecToArr(user.salt)) }
}

export async function validateSessionOwner(state: State, sessionId: string, sessionSignature: string): Promise<ErrorWithStatus | null>
{
    const session = await state.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    if (!session)
        return new ErrorWithStatus(401, 'Invalid session id.');

    const user = await state.store.User.where('id', BinaryOperator.Equal, session.userId).firstOrDefault();
    if (!state.verifyHash(sessionId, base64.base64DecToArr(sessionSignature), base64.base64DecToArr(user.salt)))
        return new ErrorWithStatus(401, 'Invalid session signature.');

    return null;
}