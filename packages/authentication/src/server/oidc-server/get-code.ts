import { base64 } from "@akala/core";
import { BinaryOperator } from "@akala/core/expressions";
import { OIDCResponseType, providers } from "../../client/oidc-state.js";
import { AuthenticationStore } from "../authentication-store.js";
import { ExchangeMiddleware } from "../master.js";

type X = {
    endpoint: URL;
    state: string;
    verifier?: string;
    query: {
        state: string;
        client_id: string;
        scope: string;
        redirect_uri: string;
        response_type: OIDCResponseType;
        code_challenge?: string;
        code_challenge_method?: string;
    };
}

export default async function authorize(store: AuthenticationStore, client_id: string, response_type: OIDCResponseType, scope: string[], redirect_uri?: string, code_challenge?: string, code_challenge_method?: string)
{
    // const state = crypto.randomUUID()
    // const endpoint = new URL(oidc.authorization_endpoint);
    // const client=await store.Client.where('id', BinaryOperator.Equal, client_id).firstOrDefault();
    // switch(response_type)
    // {
    //     case OIDCResponseType.Code:
    //         ExchangeMiddleware.grants[response_type].process()
    // }
    // const result: X = { endpoint, state, query: { state, client_id: this.providers[provider].clientId, scope: scope.join('+'), redirect_uri, response_type } };

    // if (oidc.code_challenge_methods_supported && oidc.code_challenge_methods_supported.length)
    // {
    //     if (oidc.code_challenge_methods_supported.indexOf('S256') > -1)
    //     {
    //         result.verifier = crypto.randomUUID();
    //         const encoder = new TextEncoder();
    //         const data = encoder.encode(result.verifier);
    //         result.query.code_challenge = base64.base64EncArr(await crypto.subtle.digest('SHA-256', data)).replace(/-/g, '+').replace(/_/g, '/');
    //         result.query.code_challenge_method = 'S256';
    //     }
    //     else if (oidc.code_challenge_methods_supported.indexOf('plain') > -1)
    //     {
    //         result.verifier = crypto.randomUUID();
    //         result.query.code_challenge = result.verifier;
    //         result.query.code_challenge_method = 'plain';
    //     }
    // }
    // return result;
}