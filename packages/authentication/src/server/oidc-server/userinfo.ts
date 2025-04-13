import { BinaryOperator } from "@akala/core/expressions";
import { State } from "../state.js";
import { ErrorWithStatus } from "@akala/core";

export default async function userInfo(this: State, accessToken: string): Promise<Record<string, any>>
{
    const token = await this.store.Token.where('token', BinaryOperator.Equal, accessToken).firstOrDefault();

    if (!token)
    {
        throw new ErrorWithStatus(401, 'Invalid or expired access token');
    }

    const user = await this.store.User.where('id', BinaryOperator.Equal, token.userId).firstOrDefault();

    if (!user)
        throw new ErrorWithStatus(404, `User ${token.userId} not found`);

    return {
        sub: user.id,
        name: user.name,
        email: user.attributes.email.value,
        email_verified: user.attributes.email.validated,
    };
}
