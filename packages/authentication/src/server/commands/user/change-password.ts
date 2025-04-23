// import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";
import { ErrorWithStatus, HttpStatusCode } from "@akala/core";
import { hashPassword } from "./add-user.js";
import { User } from "../../../model/user.js";

export default async function (this: State, user: User, password: string, oldPassword: string)
{
    if (!user)
        return new ErrorWithStatus(HttpStatusCode.NotFound, 'This user does not exist');
    // const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();

    Object.assign(user, await hashPassword(this, await password));
    return await this.store.User.updateSingle(user);
}
