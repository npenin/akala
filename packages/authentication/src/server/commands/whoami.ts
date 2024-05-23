import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";

export default async function (this: State, sessionId: string)
{
    const session = await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault();

    const user = await this.store.User.where('id', BinaryOperator.Equal, session.userId).firstOrDefault()

    return { attributes: user.attributes, name: user.name }
}