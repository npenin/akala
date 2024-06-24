import { State } from "../../state.js";
import { BinaryOperator } from '@akala/core/expressions'

export default async function (this: State, id: string)
{
    const client = await this.store.Client.where('id', BinaryOperator.Equal, id).firstOrDefault()
    await this.store.Client.deleteSingle(client)
} 