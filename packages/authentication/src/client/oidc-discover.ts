import { Metadata } from "@akala/commands";
import { OIDCDescriptionWithOptional } from "./oidc-state.js";

export default async function (url: string | URL): Promise<Metadata.Command[]>
{
    const result: Metadata.Command[] = [];

    const config = await fetch(new URL('./.well-known/openid-configuration', url)).then(r => r.ok ? r.json() : Promise.reject(new Error('The OIDC configuration could not be detected'))) as OIDCDescriptionWithOptional;

    if (config.authorization_endpoint)
    {
        result.push({
            name: 'authorize',
            config: {
                http: {
                    route: config.authorization_endpoint, method: 'get',
                    inject: [

                    ]
                }
            }
        });
    }
    if (config.device_authorization_endpoint)
    {
        result.push({
            name: 'authorize-device',
            config: {
                http: {
                    route: config.device_authorization_endpoint, method: 'get',
                    inject: [

                    ]
                }
            }
        });
    }
    if (config.token_endpoint)
    {
        result.push({
            name: 'get-token',
            config: {
                http: {
                    route: config.token_endpoint, method: config.token_endpoint_auth_methods_supported[0] || 'post',
                    inject: [

                    ]
                }
            }
        });
    }
    if (config.userinfo_endpoint)
    {

        result.push({
            name: 'user-info',
            config: {
                http: {
                    route: config.userinfo_endpoint, method: 'get',
                    inject: [

                    ]
                }
            }
        });
    }
    if (config.revocation_endpoint)
    {
        result.push({
            name: 'revoke',
            config: {
                http: {
                    route: config.revocation_endpoint, method: 'post',
                    inject: [

                    ]
                }
            }
        });
    }

    return result;
}
