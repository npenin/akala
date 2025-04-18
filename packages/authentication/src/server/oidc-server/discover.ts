import { Container } from "@akala/commands";
import { State } from "../state.js";
import { OICDAuthMethods, OICDGrantTypes, OIDCDescription, OIDCResponseType } from "../../client/oidc-state.js";

export default async function (this: State, container: Container<void>, url: string | URL): Promise<OIDCDescription>
{
    const metadata = await container.dispatch('$metadata');

    url = url.toString();

    const authorize = metadata.commands.find(c => c.name == 'authorize');
    const authenticate = metadata.commands.find(c => c.name == 'authenticate');
    const discover = metadata.commands.find(c => c.name == 'discover');
    const root = url.substring(0, url.length - discover.config.http.route.length);


    return {
        authorization_endpoint: new URL(authorize.config.http.route, root).toString(),
        response_modes_supported: ['query'],
        claims_supported: ['sub', 'aud'],
        response_types_supported: [OIDCResponseType.Code],
        issuer: root,
        subject_types_supported: ['public'],
        grant_types_supported: [OICDGrantTypes[OICDGrantTypes.authorization_code], OICDGrantTypes[OICDGrantTypes.refresh_token], OICDGrantTypes[OICDGrantTypes["urn:ietf:params:oauth:grant-type:device_code"]]] as (keyof typeof OICDGrantTypes)[],
        token_endpoint: new URL(authenticate.config.http.route, root).toString(),
        token_endpoint_auth_methods_supported: [OICDAuthMethods.ClientSecretBasic, OICDAuthMethods.ClientSecretPost, OICDAuthMethods.ClientSecretJwt]
    }
}
