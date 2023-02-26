import { Request } from "@akala/server";
import { ensureOptionals, JWAlgorithms, OICDAuthMethods, OIDCDescription, OIDCResponseType } from "../../../client/oidc-state.js";

export default function (req: Request): OIDCDescription
{
    const host = req.headers.host || req.socket.localAddress
    const baseUrl = new URL('https://' + host)
    return ensureOptionals(
        {
            issuer: baseUrl.toString(),
            authorization_endpoint: new URL("/authorize", baseUrl).toString(),
            token_endpoint: new URL("/token", baseUrl).toString(),
            revocation_endpoint: new URL("/revoke", baseUrl).toString(),
            jwks_uri: new URL("/keys", baseUrl).toString(),
            response_types_supported: [
                OIDCResponseType.Code,
                OIDCResponseType.Token,
                OIDCResponseType.TokenIdToken
            ],
            response_modes_supported: [
                "query",
                "fragment",
                // "form_post"
            ],
            subject_types_supported: [
                "pairwise"
            ],
            id_token_signing_alg_values_supported: [
                JWAlgorithms.RS256
            ],
            scopes_supported: [
                "openid",
                "email",
                "name"
            ],
            token_endpoint_auth_methods_supported: [
                OICDAuthMethods.ClientSecretPost
            ],
            claims_supported: [
                "aud",
                "email",
                "email_verified",
                "exp",
                "iat",
                "is_private_email",
                "iss",
                "nonce",
                "nonce_supported",
                "real_user_status",
                "sub",
                "transfer_sub"
            ]
        });
}