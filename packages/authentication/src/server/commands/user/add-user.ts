import { base64 } from "@akala/core";
import { User } from "../../../model/user.js";
import { State } from "../../state.js";

export async function hashPassword(state: State, password: string)
{
    const salt = new Uint8Array(128);
    crypto.getRandomValues(salt);
    return { salt: base64.base64EncArr(salt), password: await state.getHash(password, salt.buffer) };
}

export default async function (this: State, userName: string, password: string)
{
    const user = new User();
    user.name = userName;
    Object.assign(user, await hashPassword(this, password));
    return await this.store.User.createSingle(user);
}
