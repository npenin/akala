import { base64 } from '@akala/core'

export interface JWT
{
    header: {
        alg: string,
        typ: 'JWT'
    }
    payload: Record<string, string>
    signature?: string
}

export const jwt = {
    getAlgorithm(jwt: JWT): { prefix: 'RS' | 'HS' | 'PS' | 'ES' | 'EDDSA' | 'NONE', bits: number, subtle: Algorithm | RsaPssParams | EcdsaParams & EcKeyAlgorithm }
    {
        const [_, alg, bits] = /^(rs|hs|ps|es|EdDSA)(\d+)?$/i.exec(jwt.header.alg);

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
    async serialize(jwts: JWT, secret?: CryptoKey): Promise<string>
    {
        const signature = await jwt.sign(jwts, secret);
        // console.log(signature)
        if (signature.signature)
            return signature.payload + '.' + signature.signature;
        else
            return signature.payload;
    },
    async sign(jwts: JWT, secret?: CryptoKey)
    {
        const alg = jwt.getAlgorithm(jwts);
        if (alg.prefix == 'NONE' || secret)
        {
            const signaturePayload = base64.base64UrlEncArr(base64.strToUTF8Arr(JSON.stringify(jwts.header))) + '.' +
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
    async verify(token: JWT | string, secret?: CryptoKey)
    {
        if (typeof token == 'string')
            token = jwt.deserialize(token);
        const alg = jwt.getAlgorithm(token);
        if (alg.prefix == 'NONE')
            return true;
        if (!token.signature)
            return false;

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
    deserialize(s: string): JWT
    {
        const values = s.split('.');
        const jwt: JWT = {
            header: JSON.parse(base64.UTF8ArrToStr(base64.base64UrlDecToArr(values[0]))),
            payload: JSON.parse(base64.UTF8ArrToStr(base64.base64UrlDecToArr(values[1]))),
        };

        if (values.length == 3)
            jwt.signature = values[2];

        return jwt;
    }
}
