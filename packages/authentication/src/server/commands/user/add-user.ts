import { User } from "../../../model/user.js";
import { State } from "../../state.js";

export async function hashPassword(password: string)
{
    const salt = new Uint8Array(128);
    const decodedSalt = new TextDecoder().decode(crypto.getRandomValues(salt));
    return { salt: decodedSalt, passowrd: await this.getHash(decodedSalt + password) };

}

export default async function (this: State, userName: string, password: string)
{
    var user = new User();
    user.name = userName;
    Object.assign(user, await hashPassword(password));
    return await this.store.User.createSingle(user);
}