import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";

export default async function (this: State, token: string)
{
    return await this.store.Token.deleteSingle(await this.store.Token.where('token', BinaryOperator.Equal, token).firstOrDefault());
}