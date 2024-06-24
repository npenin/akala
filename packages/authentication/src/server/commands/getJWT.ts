import { JWT } from "@akala/jwt";
import { AuthenticationMethodReference } from "../../model/session.js";
import { State } from "../state.js";
import { BinaryOperator } from '@akala/core/expressions'

export interface OidcJwt extends Record<string, string | number | string[] | number[]>
{
    iss: string,
    sub: string,
    aud: string,
    exp: number,
    iat: number,
    auth_time?: number
    nonce?: string,
    acr?: string,
    amr?: AuthenticationMethodReference[],
    azp?: string
}

export default async function getJWT(this: State, issuer: string, clientId: string, tokenId: string, algorithm: JWT<any>['header']['alg'], nonce?: string,): Promise<JWT<OidcJwt>>
{
    const user = await this.store.Token.where('id', BinaryOperator.Equal, tokenId).where('clientId', BinaryOperator.Equal, clientId).firstOrDefault();

    if (!user)
        throw new Error()

    return {
        header: {
            alg: algorithm,
            typ: 'JWT'
        },
        payload: {
            iss: 'https://' + issuer,
            sub: user.userId,
            aud: clientId,
            exp: new Date().valueOf() + 5 * 60,
            iat: new Date().valueOf(),
            auth_time: user.createdOn.valueOf(),
            nonce,
        }
    }
}