import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";

export default async function introspect(this: State, token: string): Promise<Record<string, any>>
{
    const storedToken = await this.store.Token.where('token', BinaryOperator.Equal, token).firstOrDefault();

    if (!storedToken)
    {
        return { active: false };
    }

    return {
        active: true,
        sub: storedToken.userId,
        exp: storedToken.expiresOn,
        scope: storedToken.scope,
        client_id: storedToken.clientId,
    };
}
