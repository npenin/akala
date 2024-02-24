import { BinaryOperator } from "@akala/core/expressions";
import { User } from "../../../model/user.js";
import { State } from "../../state.js";
import ErrorWithStatus from "../../../../../core/dist/esm/errorWithStatus.js";

export default async function (this: State, userName: string, password: string, oldPassword: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();
    if (user.password != this.getHash(user.salt + oldPassword))
        throw new ErrorWithStatus(500, 'Password do not match')
    const salt = new Uint8Array(128);
    user.salt = new TextDecoder().decode(crypto.getRandomValues(salt));
    user.password = this.getHash(user.salt + password);
    return this.store.User.updateSingle(user);
}