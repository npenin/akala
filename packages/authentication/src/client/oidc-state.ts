
export interface OIDCClientState
{
    redirectUri: string | URL;
    providers: Record<string, OIDCConfiguration>;
    pendingAuthentications: Record<string, { provider: string, timeout: NodeJS.Timeout }>;
    authenticationTimeout: number;
    providerStates: Record<string, string>
}

export interface OIDCConfiguration
{
    clientId: string;
    clientSecret: string;
    scopes?: string[];
}

export type ArrayItemType<T> = T extends (infer X)[] ? X : never;

export const providers: Record<string, OIDCDescription> = {};

/**
 *  see https://sazzer.github.io/blog/2016/09/03/OpenID-Connect-Response-Types/
 */
export enum OIDCResponseType
{
    /**  The requester would like an Authorization Code to be returned to them */
    Code = "code",
    /**  The requester would like an Access Token to be returned to them */
    Token = "token",
    /**  The requester would like an ID Token to be returned to them */
    IdToken = "id_token",
    /**  The requester would like both an Authorization Code and an Access Token to be returned to them */
    CodeToken = "code token",
    /**  The requester would like both an Authorization Code and an ID Token to be returned to them */
    CodeIdToken = "code id_token",
    /**  The requester would like both an Access Token and an ID Token to be returned to them */
    TokenIdToken = "token id_token",
    /**  The requester would like an Authorization Code, an Access Token and an ID Token to be returned to them */
    CodeTokenIdToken = "code token id_token",
    /**  The requester doesn’t want any of the above to be returned to them */
    None = "none"
}


/**
 *  see https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms#section-3.1
 */
export enum JWAlgorithms
{
    /** HMAC using SHA-256 */
    HS256 = 'HS256',
    /** HMAC using SHA-384 */
    HS384 = 'HS384',
    /** HMAC using SHA-512 */
    HS512 = 'HS512',
    /** RSASSA-PKCS1-v1_5 using SHA-256 */
    RS256 = 'RS256',
    /** RSASSA-PKCS1-v1_5 using SHA-384 */
    RS384 = 'RS384',
    /** RSASSA-PKCS1-v1_5 using SHA-512 */
    RS512 = 'RS512',
    /** ECDSA using P-256 and SHA-256 */
    ES256 = 'ES256',
    /** ECDSA using P-384 and SHA-384 */
    ES384 = 'ES384',
    /** ECDSA using P-521 and SHA-512 */
    ES512 = 'ES512',
    /**  RSASSA-PSS using SHA-256 and MGF1 with SHA-256            */
    PS256 = 'PS256',
    /**  RSASSA-PSS using SHA-384 and MGF1 with SHA-384            */
    PS384 = 'PS384',
    /**  RSASSA-PSS using SHA-512 and MGF1 with SHA-512            */
    PS512 = 'PS512',
    /** No digital signature or MAC performed */
    None = 'none',
}


/**
 *  see https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms#section-7.5.1
 */
export enum JWEncryptions
{
    /** AES_128_CBC_HMAC_SHA_256 authenticated encryption algorithm, as defined in Section 5.2.3            */
    A128CBC_HS256 = 'A128CBC-HS256',
    /** AES_192_CBC_HMAC_SHA_384 authenticated encryption algorithm, as defined in Section 5.2.4            */
    A192CBC_HS384 = 'A192CBC-HS384',
    /** AES_256_CBC_HMAC_SHA_512 authenticated encryption algorithm, as defined in Section 5.2.5            */
    A256CBC_HS512 = 'A256CBC-HS512',
    /** AES GCM using 128 bit key */
    A128GCM = 'A128GCM',
    /** AES GCM using 192 bit key */
    A192GCM = 'A192GCM',
    /** AES GCM using 256 bit key */
    A256GCM = 'A256GCM',
}

/**
 *  see https://datatracker.ietf.org/doc/html/draft-ietf-jose-json-web-algorithms#section-7.5.1
 */
export enum JWSignings
{
    /** AES_128_CBC_HMAC_SHA_256 authenticated encryption algorithm, as defined in Section 5.2.3            */
    A128CBC_HS256 = 'A128CBC-HS256',
    /** AES_192_CBC_HMAC_SHA_384 authenticated encryption algorithm, as defined in Section 5.2.4            */
    A192CBC_HS384 = 'A192CBC-HS384',
    /** AES_256_CBC_HMAC_SHA_512 authenticated encryption algorithm, as defined in Section 5.2.5            */
    A256CBC_HS512 = 'A256CBC-HS512',
    /** AES GCM using 128 bit key */
    A128GCM = 'A128GCM',
    /** AES GCM using 192 bit key */
    A192GCM = 'A192GCM',
    /** AES GCM using 256 bit key */
    A256GCM = 'A256GCM',
}

export enum OICDAuthMethods
{
    ClientSecretPost = 'client_secret_post',
    ClientSecretBasic = 'client_secret_basic',
    ClientSecretJwt = 'client_secret_jwt',
    PrivateKeyJwt = 'private_key_jwt'
}

export enum OICDGrantTypes
{
    "authorization_code",
    "refresh_token",
    "implicit",
    "urn:ietf:params:oauth:grant-type:device_code",
    "urn:ietf:params:oauth:grant-type:jwt-bearer"
}

export interface SupportedSignatureMap
{
    'signing_alg_values_supported': JWAlgorithms[],
}
export interface SupportedEncryptionMap
{
    'encryption_alg_values_supported': JWAlgorithms[],
    'encryption_enc_values_supported': JWEncryptions[],
}

export type Partialize<T, TOptionalKeys extends keyof T> = Omit<T, TOptionalKeys> & Pick<Partial<T>, TOptionalKeys>


export type SupportedSignature<T extends string> = { [key in keyof SupportedSignatureMap as `${T}_${key}`]: SupportedSignatureMap[key] };
export type SupportedEncryption<T extends string> = { [key in keyof SupportedEncryptionMap as `${T}_${key}`]: SupportedEncryptionMap[key] };

export type Endpoint<T extends string> = { [key in T as `${T}_endpoint`]: string }

export type EndpointWithAuth<T extends string> = Endpoint<T> &
    { [key in T as `${T}_endpoint_auth_methods_supported`]: OICDAuthMethods[] } &
    SupportedSignature<`${T}_endpoint_auth`>
    ;

export interface OIDCDescription extends
    Endpoint<'authorization'>,
    Partial<Endpoint<'device_authorization'>>,
    Partialize<EndpointWithAuth<'token'>, 'token_endpoint_auth_signing_alg_values_supported'>,
    Partial<Endpoint<'userinfo'>>,
    Partial<Endpoint<'registration'>>,
    Partial<EndpointWithAuth<'revocation'>>,
    Partial<EndpointWithAuth<'introspection'>>,
    Partial<SupportedEncryption<'userinfo'>>,
    Partial<SupportedSignature<'userinfo'>>,
    Partial<SupportedEncryption<'id_token'>>,
    Partial<SupportedSignature<'id_token'>>,
    Partial<SupportedEncryption<'request_object'>>,
    Partial<SupportedSignature<'request_object'>>
{
    issuer: string,
    jwks_uri?: string,
    response_types_supported: OIDCResponseType[],
    response_modes_supported: ("query" |
        "fragment" |
        "form_post")[],
    subject_types_supported: ('pairwise' | 'public')[],
    scopes_supported?: string[],
    claims_types_supported?: ('aggregated' | 'distributed' | 'normal')[],
    claims_supported: string[],
    code_challenge_methods_supported?: ("plain" | "S256")[],
    grant_types_supported: OICDGrantTypes[],
    display_values_supported?: ('page' | 'popup' | 'touch' | 'wap')[],
    service_documentation?: string,
    claims_locales_supported?: string[],
    ui_locales_supported?: string[],
    claims_parameter_supported?: boolean
    request_parameter_supported?: boolean
    request_uri_parameter_supported?: boolean,
    require_request_uri_registration?: boolean,
    op_policy_uri?: string,
    op_tos_uri?: string,
}

export type OIDCDescriptionWithOptional = Partialize<OIDCDescription, 'grant_types_supported' | 'response_modes_supported' | 'token_endpoint_auth_methods_supported' | 'claims_types_supported' | 'request_uri_parameter_supported'>

export function ensureOptionals(config: OIDCDescriptionWithOptional): OIDCDescription
{
    if (!config.grant_types_supported)
        config.grant_types_supported = [OICDGrantTypes.authorization_code, OICDGrantTypes.implicit]
    if (!config.response_modes_supported)
        config.response_modes_supported = ['fragment', 'query'];
    if (!config.token_endpoint_auth_methods_supported)
        config.token_endpoint_auth_methods_supported = [OICDAuthMethods.ClientSecretBasic];
    if (!config.claims_types_supported)
        config.claims_types_supported = ['normal']
    if (typeof config.request_uri_parameter_supported === 'undefined')
        config.request_uri_parameter_supported = true
    return config as OIDCDescription;
}

export type ExchangeMap = {
    AuthorizationCode: {
        endpointName: 'authorization',
        request: {
            client_id: string,
            client_secret?: string,
            state?: string,
            scope: string,
            redirect_uri?: string,
            response_type: 'code'
        },
        response: {
            code: string
        }
    },
    PKCE: ExchangeMap['AuthorizationCode'] & {
        request: ExchangeMap['AuthorizationCode']['request'] & {
            code_challenge: string,
            code_challenge_method: ArrayItemType<OIDCDescription['code_challenge_methods_supported']>
        }
    },
    ClientCredentials: {},
    DeviceCode: {},
    RefreshToken: {},
    ImplicitFlow: {},
    PasswordGrant: {},
};