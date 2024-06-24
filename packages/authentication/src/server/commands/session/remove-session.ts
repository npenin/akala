import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";

export default async function (this: State, sessionId: string)
{
    return await this.store.Session.deleteSingle(await this.store.Session.where('id', BinaryOperator.Equal, sessionId).firstOrDefault());
}