import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";

export default async function (this: State, userName: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();
    user.disabled = true;
    return await this.store.User.updateSingle(user);
}