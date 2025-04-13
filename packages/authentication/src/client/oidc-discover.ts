import { Metadata } from "@akala/commands";
import { OIDCDescriptionWithOptional } from "./oidc-state.js";

export interface OIDCMetadata
{
    rootUrl: URL;
    authorize?: Metadata.Configurations;
    "authorize-device"?: Metadata.Configurations;
    "get-token"?: Metadata.Configurations;
    "user-info"?: Metadata.Configurations;
    revoke?: Metadata.Configurations;
}

export default async function (url: string | URL): Promise<OIDCMetadata>
{
    const result: OIDCMetadata = { rootUrl: new URL(url) };

    const config = await fetch(new URL('./.well-known/openid-configuration', url)).then(r => r.ok ? r.json() : Promise.reject(new Error('The OIDC configuration could not be detected'))) as OIDCDescriptionWithOptional;

    if (config.authorization_endpoint)
    {
        result.authorize = {
            http: {
                route: config.authorization_endpoint, method: 'get',
                inject: [

                ]
            }
        };
    }
    if (config.device_authorization_endpoint)
    {
        result['authorize-device'] = {
            http: {
                route: config.device_authorization_endpoint, method: 'get',
                inject: [

                ]
            }
        };
    }
    if (config.token_endpoint)
    {
        result['get-token'] = {
            http: {
                route: config.token_endpoint, method: config.token_endpoint_auth_methods_supported[0] || 'post',
                inject: [

                ]
            }
        };
    }

    if (config.userinfo_endpoint)
    {

        result['user-info'] = {
            http: {
                route: config.userinfo_endpoint, method: 'get',
                inject: [

                ]
            }
        };
    }
    if (config.revocation_endpoint)
    {
        result.revoke = {
            http: {
                route: config.revocation_endpoint, method: 'post',
                inject: [

                ]
            }
        };
    }

    return result;
}
