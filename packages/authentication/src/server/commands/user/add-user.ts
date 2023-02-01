import { User } from "../../../model/user.js";
import { State } from "../../state.js";

export default async function (this: State, userName: string, password: string)
{
    var user = new User();
    user.name = userName;
    user.password = this.getHash(password);
    return this.store.User.createSingle(user);
}