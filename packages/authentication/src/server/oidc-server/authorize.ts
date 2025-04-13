import { BinaryOperator } from "@akala/core/expressions";
import { OIDCResponseType } from "../../client/oidc-state.js";
import { State } from "../state.js";
import { ErrorWithStatus } from "@akala/core";
import crypto from 'crypto';
import { User } from "../../model/user.js";

export default async function authorize(this: State, user: User, scope: string, response_type: OIDCResponseType, client_id: string, redirect_uri: string, state?: string,
    nonce?: string, display?: 'page' | 'popup' | 'touch' | 'wap', prompt?: 'none' | 'login' | 'content' | 'select_account',
    max_age?: string, ui_locales?: string, id_token_hint?: string, login_hint?: string, acr_values?: string)
{
    if (!redirect_uri || !client_id)
        throw new ErrorWithStatus(400, 'Invalid redirect_uri');

    const client = await this.store.Client.where('id', BinaryOperator.Equal, client_id).firstOrDefault();
    if (!client?.redirectUris.includes(redirect_uri))
        throw new ErrorWithStatus(400, 'Invalid redirect_uri');

    if (!response_type || !['code', 'token', 'id_token'].includes(response_type))
        throw new ErrorWithStatus(400, 'Invalid response_type');

    if (!scope?.split(' ').includes('openid'))
        throw new ErrorWithStatus(400, 'Invalid scope');

    // Generate authorization code
    const authorizationCode = crypto.randomBytes(32).toString('hex');
    await this.store.AuthorizationCode.createSingle({
        code: authorizationCode,
        clientId: client_id,
        redirectURI: redirect_uri,
        scope: scope,
        state: state,
        nonce: nonce,
        createdOn: new Date(),
        userId: user.id,
    });

    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authorizationCode);
    if (state)
        redirectUrl.searchParams.append('state', state);

    return redirectUrl.toString();
}
