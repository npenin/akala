import { ErrorWithStatus, base64 } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";
import addSession from "./session/add-session.js";
import removeSession from "./session/remove-session.js";
import extendSession from "./session/extend-session.js";
import { AuthenticationMethodReference, Session } from "../../model/session.js";

export default async function (this: State, username: string, password: string, deviceId?: string, connectionId?: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, username).firstOrDefault();

    if (!user)
        throw new ErrorWithStatus(401, 'Invalid Username (or password).');

    if (!await this.verifyHash(password, base64.base64DecToArr(user.password), base64.base64DecToArr(user.salt).buffer))
        throw new ErrorWithStatus(401, 'Invalid (Username or) password).');

    if (user.disabled)
        throw new ErrorWithStatus(409, 'The user is disabled');

    let session: Session;
    if (this.session?.slidingExpiration || this.session?.timeout)
        session = await addSession.call(this, deviceId, user.id, new Date(new Date().valueOf() + (this.session.slidingExpiration || this.session.timeout)), AuthenticationMethodReference.pwd, connectionId);
    else
        session = await addSession.call(this, deviceId, user.id, null, AuthenticationMethodReference.pwd, connectionId);

    session.userId = user.id;

    return { id: user.id, sessionId: session.id, sessionSignature: await this.getHash(session.id, base64.base64DecToArr(user.salt).buffer) }
}

export async function validateSessionOwner(state: State, sessionId: string, sessionSignature: string): Promise<Session | null>
{
    let session = await state.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    if (!session)
        throw new ErrorWithStatus(401, 'Invalid session id.');

    if (session.expiresOn < new Date())
        await removeSession.call(this, sessionId);

    session = await extendSession.call(this, sessionId);

    const user = await state.store.User.where('id', BinaryOperator.Equal, session.userId).firstOrDefault();
    if (!await state.verifyHash(sessionId, base64.base64DecToArr(sessionSignature), base64.base64DecToArr(user.salt).buffer))
        throw new ErrorWithStatus(401, 'Invalid session signature.');

    return session;
}