import { User } from "../../../model/user.js";
import { State } from "../../state.js";

export default async function (this: State, userName: string, password: string)
{
    var user = new User();
    user.name = userName;
    const salt = new Uint8Array(128);
    user.salt = new TextDecoder().decode(crypto.getRandomValues(salt));
    user.password = this.getHash(user.salt + password);
    return this.store.User.createSingle(user);
}