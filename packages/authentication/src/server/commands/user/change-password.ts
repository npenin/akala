import { BinaryOperator } from "@akala/core/expressions";
import { User } from "../../../model/user.js";
import { State } from "../../state.js";

export default async function (this: State, userName: string, password: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();
    user.password = this.getHash(password);
    return this.store.User.updateSingle(user);
}