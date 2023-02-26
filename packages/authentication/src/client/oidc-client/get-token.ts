import { OIDCClientState, OIDCResponseType, providers, OICDAuthMethods } from "../oidc-state.js";


type X = {
    endpoint: URL;
    verifier?: string;
    query: {
        code: string;
        client_id: string;
        client_secret: string;
        grant_type: OIDCResponseType;
        code_verifier?: string;
    };
}

type JWT = {
    iss: string,
    sub: string,
    aud: string | URL,
    jti: any,
    exp: number,

}

type Request<TQuery extends Record<string, string> = Record<string, string>, THeaders extends Record<string, string> = Record<string, string>, TBody extends Record<string, string> = Record<string, string>> = {
    endpoint: URL,
    query?: Record<string, string>,
    headers?: Record<string, string>,
    body?: Record<string, string>
}


export default function (this: OIDCClientState, provider: string, code: string, verifier?: string, jwtDurationInMinutes?: number): Request
{
    const oidc = providers[provider];
    const endpoint = new URL(oidc.token_endpoint);
    var x: OICDAuthMethods = oidc.token_endpoint_auth_methods_supported[0]
    const result: Request = {
        endpoint,
        query: {
            grant_type: OIDCResponseType.Code,
            client_id: this.providers[provider].clientId,
            client_secret: this.providers[provider].clientSecret,
            code: code,
            code_verifier: verifier,
        }
    };
    const providerConfig = this.providers[provider];
    if (providerConfig.clientSecret)
        switch (x)
        {
            case OICDAuthMethods.ClientSecretBasic:
                result.headers.authorization = Buffer.from(providerConfig.clientId + ':' + providerConfig.clientSecret).toString('base64');
                return result;
            case OICDAuthMethods.ClientSecretPost:
                result.body = result.query;
                result.query = undefined;
                return result;
            case OICDAuthMethods.ClientSecretJwt:
                throw new Error('Not supported');
            // return {
            //     iss: providerConfig.clientId,
            //     sub: providerConfig.clientId,
            //     aud: oidc.token_endpoint,
            //     jti: crypto.randomUUID(),
            //     exp: new Date().valueOf() + 1000 * 60 * jwtDurationInMinutes
            // }
            case OICDAuthMethods.PrivateKeyJwt:
                throw new Error('Not supported');
        }
}