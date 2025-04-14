import { Metadata } from "@akala/commands";
import { OIDCDescriptionWithOptional } from "./oidc-state.js";
import { JWK } from "@akala/jwt";

export interface OIDCMetadata
{
    rootUrl: URL;
    authorize?: Metadata.Configurations;
    authorizeDevice?: Metadata.Configurations;
    getToken?: Metadata.Configurations;
    userInfo?: Metadata.Configurations;
    revoke?: Metadata.Configurations;
    keys?: Record<string, JWK>;
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
                inject: [{
                    clientId: "query.client_id",
                    responseType: "query.response_type",
                    redirectUri: "query.redirect_uri",
                    scope: "query.scope",
                }
                ],
            }
        };
    }
    if (config.device_authorization_endpoint)
    {
        result.authorizeDevice = {
            http: {
                route: config.device_authorization_endpoint, method: 'get',
                inject: [

                ]
            }
        };
    }
    if (config.token_endpoint)
    {
        switch (config.token_endpoint_auth_methods_supported?.[0])
        {
            case 'client_secret_post':
                result.getToken = {
                    http: {
                        route: config.token_endpoint,
                        method: 'post',
                        contentType: 'form-urlencoded',
                        inject: [
                            {
                                grantType: "body.grant_type",
                                code: "body.code",
                                redirectUri: "body.redirect_uri",
                                scope: "body.scope",
                            }
                        ],
                        auth: {
                            inject: [
                                {
                                    client_id: "auth.clientId",
                                    client_secret: "auth.clientSecret",
                                }],
                            mode: 'body',
                        }
                    }
                };
                break;
            case 'client_secret_basic':
                result.getToken = {
                    http: {
                        route: config.token_endpoint,
                        method: 'get',
                        inject: [
                            {
                                grantType: "query.grant_type",
                                code: "query.code",
                                redirectUri: "query.redirect_uri",
                                scope: "query.scope",
                            }
                        ],
                        auth: {
                            inject: [
                                {
                                    username: "auth.clientId",
                                    password: "auth.clientSecret",
                                }],
                            mode: 'basic',
                        }
                    }
                };
                break;
            case 'client_secret_jwt':
            case 'private_key_jwt':
            default:
                throw new Error(`The OIDC provider ${url} does not support the client_secret_post method for token exchange`);
        }
    }

    if (config.userinfo_endpoint)
    {

        result.userInfo = {
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
    if (config.jwks_uri)
    {
        result.keys = await fetch(config.jwks_uri).then(res => res.ok ? res.json() : Promise.reject(res)).then(certs =>
        {
            return Object.fromEntries(certs.keys.map(k => [k.kid, k]));
        })
    }

    return result;
}
