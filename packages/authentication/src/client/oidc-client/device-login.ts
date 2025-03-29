import { Http } from "@akala/core";
import { OIDCClientState, OIDCResponseType, providers } from "../oidc-state.js";

type X = {
    "device_code": string,
    "user_code": string,
    "verification_uri": string,
    "interval": number,
    "expires_in": number
}

export default async function login(this: OIDCClientState, providerName: string, http: Http, grantType: OIDCResponseType, scopes: string): Promise<X>
{
    return await http.getJSON<X>(providers[providerName].device_authorization_endpoint, new URLSearchParams({
        response_type: grantType, scope: scopes
    }));
}
