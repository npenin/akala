import { base64 } from '@akala/core'

export type JWTValues = string | number | string[] | number[]

export type JWAlgorithms = 'RS256' | 'RS384' | 'RS512' | 'HS256' | 'HS384' | 'HS512' | 'PS256' | 'PS384' | 'PS512' | 'ES256' | 'ES384' | 'ES512' | 'EcDSA' | 'none';

export interface JWT<T extends Record<string, JWTValues>> 
{
    header: {
        alg: JWAlgorithms,
        typ: 'JWT';
        kid?: string;
    }
    payload: T
    signature?: string
}

export type KeyType = 'oct' | 'RSA' | 'EC' | 'OKP' | 'PEM'

export interface JWK
{
    alg?: JWAlgorithms,
    x5c?: string[]
    kty: KeyType
}

type SubtleAglorithms = Algorithm | RsaPssParams | EcdsaParams & EcKeyAlgorithm;

function mapKeyTypeToAlgorithm(keyType: KeyType): SubtleAglorithms
{
    switch (keyType)
    {
        case 'RSA':
            return { name: 'RSA-PSS', hash: 'SHA-256' }
        case 'EC':
            return {
                name: "ECDSA",
                namedCurve: 'P-521',
                hash: { name: "SHA-512" },
            }
        case 'oct':
        case 'OKP':
        case 'PEM':
        default:
            throw new Error('Not support key type: ' + keyType)
    }
}

export const jwt = {
    getCryptoKeyFromWebKey(key: JWK)
    {
        if (key.alg)
            return crypto.subtle.importKey('jwk', key, jwt.getAlgorithmFromWebKey(key as any).subtle, // Extractable and algorithm details
                true,
                ["verify"]);

        if (key.x5c)
        {
            return crypto.subtle.importKey('spki', base64.base64DecToArr(key.x5c[0]), mapKeyTypeToAlgorithm(key.kty), // Extractable and algorithm details
                true,
                ["verify"]);
        }
    },
    getAlgorithmFromWebKey(key: { alg: JWT<Record<string, JWTValues>>['header']['alg'] }): { prefix: 'RS' | 'HS' | 'PS' | 'ES' | 'EDDSA' | 'NONE', bits: number, subtle: SubtleAglorithms }
    {
        console.log(key.alg);
        const [_, alg, bits] = /^(rs|hs|ps|es|EdDSA)(\d+)?$/i.exec(key.alg);

        switch (alg.toUpperCase())
        {
            case 'HS':
                return { prefix: alg.toUpperCase() as 'HS', bits: Number(bits), subtle: { name: 'HMAC', hash: 'SHA-' + bits } };
            case 'PS':
                return { prefix: alg.toUpperCase() as 'PS', bits: Number(bits), subtle: { name: 'RSA-PSS', hash: 'SHA-' + bits } };
            case 'RS':
                return { prefix: alg.toUpperCase() as 'RS', bits: Number(bits), subtle: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-' + bits } };
            case 'ES':
                if (bits == '512')
                    return {
                        prefix: alg.toUpperCase() as 'ES', bits: Number(bits), subtle: {
                            name: "ECDSA",
                            namedCurve: 'P-521',
                            hash: { name: "SHA-" + bits },
                        }
                    }
                return {
                    prefix: alg.toUpperCase() as 'ES', bits: Number(bits), subtle: {
                        name: "ECDSA",
                        namedCurve: 'P-' + bits,
                        hash: { name: "SHA-" + bits },
                    }
                };
            case 'EDDSA':
                return { prefix: alg.toUpperCase() as 'EDDSA', bits: 0, subtle: { name: 'Ed25519' } };
            case 'NONE':
                return { prefix: alg.toUpperCase() as 'NONE', bits: 0, subtle: null };

        }
    },
    getAlgorithm<T extends Record<string, string | number | string[] | number[]>>(token: JWT<T>): { prefix: 'RS' | 'HS' | 'PS' | 'ES' | 'EDDSA' | 'NONE', bits: number, subtle: SubtleAglorithms }
    {
        return jwt.getAlgorithmFromWebKey(token.header);
    },
    async serialize<T extends Record<string, JWTValues>>(jwts: JWT<T>, secret?: CryptoKey): Promise<string>
    {
        const signaturePayload = base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(jwts.header))) + '.' +
            base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(jwts.payload)));
        if (jwts.signature)
            return signaturePayload + '.' + jwts.signature;

        const signature = await jwt.sign(jwts, secret, jwts.signature);
        // console.log(signature)
        if (signature.signature)
            return signature.payload + '.' + signature.signature;
        else
            return signature.payload;
    },
    async sign<T extends Record<string, JWTValues>>(jwts: JWT<T>, secret?: CryptoKey, signaturePayload?: string)
    {
        const alg = jwt.getAlgorithm(jwts);
        if (alg.prefix == 'NONE' || secret)
        {
            if (!signaturePayload)
                signaturePayload = base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(jwts.header))) + '.' +
                    base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(jwts.payload)));


            switch (alg.prefix.toUpperCase())
            {
                case 'HS':
                case 'RS':
                case 'ES':
                case 'EDDSA':
                    return { payload: signaturePayload, signature: base64.base64UrlEncArr(new Uint8Array(await crypto.subtle.sign(alg.subtle, secret, base64.strToUTF8Arr(signaturePayload)))) }
                case 'PS':
                    return { payload: signaturePayload, signature: base64.base64UrlEncArr(new Uint8Array(await crypto.subtle.sign({ ...alg.subtle, saltLength: alg.bits >> 3 }, secret, base64.strToUTF8Arr(signaturePayload)))) }
                case 'NONE':
                    return { payload: signaturePayload, signature: null };
            }
        }
        throw new Error('unsupported algorithm or key not provided');
    },
    async verify<T extends Record<string, JWTValues>>(token: JWT<T> | string, secret?: CryptoKey)
    {
        if (typeof token == 'string')
            token = jwt.deserialize(token);
        const alg = jwt.getAlgorithm(token);
        if (alg.prefix == 'NONE')
            return true;
        if (!token.signature)
            return true;

        if (secret)
        {
            const signaturePayload = base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(token.header))) + '.' +
                base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(token.payload)));


            switch (alg.prefix.toUpperCase())
            {
                case 'HS':
                case 'RS':
                case 'ES':
                case 'EDDSA':
                    return await crypto.subtle.verify(alg.subtle, secret, base64.base64UrlDecToArr(token.signature), base64.strToUTF8Arr(signaturePayload),)
                case 'PS':
                    return await crypto.subtle.verify({ ...alg.subtle, saltLength: alg.bits >> 3 }, secret, base64.base64UrlDecToArr(token.signature), base64.strToUTF8Arr(signaturePayload))
            }
        }
        throw new Error('unsupported algorithm or key not provided');
    },
    deserialize<T extends Record<string, JWTValues>>(s: string): JWT<T>
    {
        const values = s.split('.');
        const jwt: JWT<T> = {
            header: JSON.parse(base64.UTF8ArrToStr(base64.base64UrlDecToArr(values[0]))),
            payload: JSON.parse(base64.UTF8ArrToStr(base64.base64UrlDecToArr(values[1]))),
        };

        if (values.length == 3)
            jwt.signature = values[2];

        return jwt;
    }
}
