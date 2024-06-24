import { OIDCResponseType } from "../../client/oidc-state.js";
import { State } from "../state.js";

export default async function (this: State, scope: string, response_type: OIDCResponseType, client_id: string, redirect_uri: string, state?: string,
    nonce?: string, display?: 'page' | 'popup' | 'touch' | 'wap', prompt?: 'none' | 'login' | 'content' | 'select_account',
    max_age?: string, ui_locales?: string, id_token_hiny?: string, login_hint?: string, acr_values?: string)
{
    // this.store.Applications.
}