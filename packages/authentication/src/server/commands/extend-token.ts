import { BinaryOperator } from "@akala/core/expressions";
import { randomUUID } from "crypto";
import { State } from "../state.js";

export default async function (this: State, tokenId: string, expiresOn?: Date | string)
{
    const token = await this.store.Token.where('token', BinaryOperator.Equal, tokenId).firstOrDefault();

    token.expiresOn = typeof expiresOn == 'string' ? new Date(expiresOn) : expiresOn;

    return await this.store.Token.updateSingle(token);
}