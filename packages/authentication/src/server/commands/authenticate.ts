import { ErrorWithStatus } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";

export default async function (this: State, tokenId: string)
{
    const token = await this.store.Token.where('token', BinaryOperator.Equal, tokenId).firstOrDefault();

    if (!token)
        throw new ErrorWithStatus(401, 'Invalid token.');

    const user = await this.store.User.where('id', BinaryOperator.Equal, token.userId).firstOrDefault();

    return { id: user.id, displayName: user.displayName, username: user.name }
}