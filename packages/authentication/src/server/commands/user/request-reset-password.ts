import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../../state.js";
import { Token } from "../../../model/access-token.js";

export default async function (this: State, userName: string)
{
    const user = await this.store.User.where('name', BinaryOperator.Equal, userName).firstOrDefault();


    const code: Token = {
        scope: ['reset-password'],
        token: crypto.randomUUID(),
        userId: user.id,
        clientId: '',
        tokenType: 'reset-password-code',
        expiresOn: new Date(new Date().valueOf() + 24 * 3600 * 1000)
    };

    await this.store.Token.createSingle(code);
    return { code: code.token };
}