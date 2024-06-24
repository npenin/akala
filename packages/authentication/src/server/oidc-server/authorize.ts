import { BinaryOperator } from "@akala/core/expressions";
import { OIDCResponseType } from "../../client/oidc-state.js";
import { State } from "../state.js";
import ErrorWithStatus from "../../../../core/dist/esm/errorWithStatus.js";

export default async function (this: State, scope: string, response_type: OIDCResponseType, client_id: string, redirect_uri: string, state?: string,
    nonce?: string, display?: 'page' | 'popup' | 'touch' | 'wap', prompt?: 'none' | 'login' | 'content' | 'select_account',
    max_age?: string, ui_locales?: string, id_token_hint?: string, login_hint?: string, acr_values?: string)
{
    if (!redirect_uri || !client_id)
        throw new ErrorWithStatus(400, 'Invalid redirect_uri');

    const client = await this.store.Client.where('id', BinaryOperator.Equal, client_id).firstOrDefault();
    if (!client || client.redirectUri != redirect_uri)
        throw new ErrorWithStatus(400, 'Invalid redirect_uri');


}