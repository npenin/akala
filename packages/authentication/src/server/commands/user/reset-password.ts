import { BinaryOperator } from "@akala/core/expressions";
import { ErrorWithStatus } from "@akala/core";
import { State } from "../../state.js";
import { AuthorizationCode } from "../../../model/authorization-code.js";
import { hashPassword } from "./add-user.js";

export default async function (this: State, userName: string, code: string, password: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();

    const token = await this.store.Token.where('token', BinaryOperator.Equal, code).firstOrDefault();

    if (!token)
        throw new ErrorWithStatus(404, 'There is no such token')

    await this.store.Token.deleteSingle(token);
    if (token.expiresOn < new Date())
    {
        throw new ErrorWithStatus(500, 'The token is expired')
    }

    Object.assign(user, await hashPassword(this, password));
    return this.store.User.updateSingle(user);
}