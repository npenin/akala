// import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";
import { ErrorWithStatus } from "@akala/core";
import { hashPassword } from "./add-user.js";
import { User } from "../../../model/user.js";

export default async function (this: State, user: User, password: string, oldPassword: string)
{
    // const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();
    if (user.password != await this.getHash(user.salt + oldPassword))
        throw new ErrorWithStatus(500, 'Password do not match')

    Object.assign(user, await hashPassword(this, password));
    return await this.store.User.updateSingle(user);
}
