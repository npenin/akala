import { ErrorWithStatus } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";

export default async function (this: State, username: string, password: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, username).firstOrDefault();

    if (!user)
        throw new ErrorWithStatus(401, 'Invalid Username (or password).');

    if (user.password !== this.getHash(password))
        throw new ErrorWithStatus(401, 'Invalid (Username or) password).');

    return { id: user.id, displayName: user.displayName, username: user.name }
}