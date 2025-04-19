// import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";
import { ErrorWithStatus, HttpStatusCode } from "@akala/core";
import { hashPassword } from "./add-user.js";
import { User } from "../../../model/user.js";
import { Query } from "@akala/storage";

export default async function (this: State, pUser: Promise<Query<User>>, password: Promise<string>, oldPassword: Promise<string>)
{
    const user = await (await pUser).firstOrDefault();
    if (!user)
        return new ErrorWithStatus(HttpStatusCode.NotFound, 'This user does not exist');
    // const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();
    if (user.password != await this.getHash(user.salt + await oldPassword))
        throw new ErrorWithStatus(500, 'Password do not match')

    Object.assign(user, await hashPassword(this, await password));
    return await this.store.User.updateSingle(user);
}
