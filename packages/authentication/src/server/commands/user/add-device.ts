import { BinaryOperator } from "@akala/core/expressions";
import { randomUUID } from "crypto";
import { Token } from "../../../model/access-token.js";
import { State } from "../../state.js";

export default async function (this: State, clientId: string, userName: string, scope: string[])
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();

    const token = new Token();

    token.userId = user.id;
    token.scope = scope;
    token.token = randomUUID();
    token.clientId = clientId;

    return await this.store.Token.createSingle(token);
}