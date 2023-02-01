import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";

export default async function (this: State, userName: string)
{
    return await this.store.User.deleteSingle(await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault());
}