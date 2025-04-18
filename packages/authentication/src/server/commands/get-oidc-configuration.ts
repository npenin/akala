import { Container } from "@akala/commands";
import { ensureOptionals, JWAlgorithms, OICDAuthMethods, OIDCDescription, OIDCResponseType } from "../../client/oidc-state.js";
import { State } from "../state.js";

export default async function (this: State, url: string | URL, container: Container<void>): Promise<OIDCDescription>
{
    const metadata = await container.dispatch('$metadata');

    url = url.toString();

    const authorize = metadata.commands.find(c => c.name == 'authorize');
    const authenticate = metadata.commands.find(c => c.name == 'authenticate');
    const discover = metadata.commands.find(c => c.name == 'get-oidc-configuration');
    const revoke = metadata.commands.find(c => c.name == 'remove-token');
    const jwks = metadata.commands.find(c => c.name == 'get-keys');
    const root = url.substring(0, url.length - discover.config?.http?.route?.length);

    return ensureOptionals(
        {
            issuer: root,
            authorization_endpoint: authorize?.config?.http?.route && new URL(authorize.config.http.route, root).toString(),
            token_endpoint: authenticate?.config?.http?.route && new URL(authenticate.config.http.route, root).toString(),
            revocation_endpoint: revoke?.config?.http?.route && new URL(revoke.config.http.route, root).toString(),
            jwks_uri: jwks?.config?.http?.route && new URL(jwks.config.http.route, root).toString(),
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
