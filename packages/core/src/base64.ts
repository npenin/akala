///
/// Courtesy of https://developer.mozilla.org/en-US/docs/Glossary/Base64#solution_2_%E2%80%93_rewriting_atob_and_btoa_using_typedarrays_and_utf-8
///

// Array of bytes to Base64 string decoding
/** 
 * Converts a Base64 character code to its 6-bit integer value.
 * @param nChr The character code of the Base64 character (0-255).
 * @returns The 6-bit value (0-63) of the Base64 character.
 */
function b64ToUint6(nChr: number): number
{
    return nChr > 64 && nChr < 91
        ? nChr - 65
        : nChr > 96 && nChr < 123
            ? nChr - 71
            : nChr > 47 && nChr < 58
                ? nChr + 4
                : nChr === 43
                    ? 62
                    : nChr === 47
                        ? 63
                        : 0;
}

/** 
 * Decodes a Base64 string into a Uint8Array.
 * @param sBase64 The Base64 encoded string.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The decoded byte array.
 */
export function base64DecToArr(sBase64: string, nBlocksSize?: number): Uint8Array
{
    const sB64Enc = sBase64.replace(/[^A-Za-z0-9+/]/g, "");
    const nInLen = sB64Enc.length;
    const nOutLen = nBlocksSize
        ? Math.ceil(((nInLen * 3 + 1) >> 2) / nBlocksSize) * nBlocksSize
        : (nInLen * 3 + 1) >> 2;
    const taBytes = new Uint8Array(nOutLen);

    let nMod3;
    let nMod4;
    let nUint24 = 0;
    let nOutIdx = 0;
    for (let nInIdx = 0; nInIdx < nInLen; nInIdx++)
    {
        nMod4 = nInIdx & 3;
        nUint24 |= b64ToUint6(sB64Enc.charCodeAt(nInIdx)) << (6 * (3 - nMod4));
        if (nMod4 === 3 || nInLen - nInIdx === 1)
        {
            nMod3 = 0;
            while (nMod3 < 3 && nOutIdx < nOutLen)
            {
                taBytes[nOutIdx] = (nUint24 >>> ((16 >>> nMod3) & 24)) & 255;
                nMod3++;
                nOutIdx++;
            }
            nUint24 = 0;
        }
    }

    return taBytes;
}

/* Base64 string to array encoding */
/** 
 * Converts a 6-bit integer to its corresponding Base64 character code.
 * @param {number} nUint6 The 6-bit value (0-63) to convert.
 * @returns The character code of the Base64 character.
 */
function uint6ToB64(nUint6)
{
    return nUint6 < 26
        ? nUint6 + 65
        : nUint6 < 52
            ? nUint6 + 71
            : nUint6 < 62
                ? nUint6 - 4
                : nUint6 === 62
                    ? 43
                    : nUint6 === 63
                        ? 47
                        : 65;
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64URL format.
 * @param aBytes The byte array to encode.
 * @returns The Base64URL encoded string.
 */
export function base64UrlEncArr(aBytes: ArrayBuffer | Uint8Array): string
{
    let s = base64EncArr(aBytes).replace(/\+/g, '-').replace(/\//g, '_');
    while (s.endsWith('='))
        s = s.substring(0, s.length - 1);
    return s;
}
/** 
 * Decodes a Base64URL string into an ArrayBuffer/Uint8Array.
 * @param s The Base64URL encoded string.
 * @returns The decoded byte array.
 */
export function base64UrlDecToArr(s: string): ArrayBuffer | Uint8Array
{
    s = s.replace(/-/g, '+').replace(/_/g, '/');
    switch (s.length % 3)
    {
        case 0:
            break;
        case 1:
            s += '=';
            break;
        case 2:
            s += '==';
            break;
    }
    return base64DecToArr(s.replace(/-/g, '+').replace(/_/g, '/'));
}

/** 
 * Extracts the binary content from a PEM-formatted private key.
 * @param pem The PEM string containing the private key.
 * @returns The decoded binary content of the private key.
 */
export function extractPrivateKey(pem: string)
{
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    return base64DecToArr(pem.substring(
        pemHeader.length,
        pem.length - pemFooter.length - 1,
    ));
}
/** 
 * Extracts the binary content from a PEM-formatted public key.
 * @param pem The PEM string containing the public key.
 * @returns The decoded binary content of the public key.
 */
export function extractPublicKey(pem: string)
{
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    return base64DecToArr(pem.substring(
        pemHeader.length,
        pem.length - pemFooter.length - 1,
    ));
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64 string.
 * @param aBytes The byte array to encode.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The Base64 encoded string.
 */
export function base64EncArr(aBytes: ArrayBuffer | Uint8Array, nBlocksSize?: number): string
{
    let nMod3 = 2;
    let sB64Enc = "";

    const nLen = aBytes.byteLength;
    let nUint24 = 0;
    for (let nIdx = 0; nIdx < nLen; nIdx++)
    {
        nMod3 = nIdx % 3;
        if (typeof (nBlocksSize) !== 'undefined' && nIdx > 0 && ((nIdx * 4) / 3) % nBlocksSize === 0)
        {
            sB64Enc += "\r\n";
        }

        nUint24 |= aBytes[nIdx] << ((16 >>> nMod3) & 24);
        if (nMod3 === 2 || aBytes.byteLength - nIdx === 1)
        {
            sB64Enc += String.fromCodePoint(
                uint6ToB64((nUint24 >>> 18) & 63),
                uint6ToB64((nUint24 >>> 12) & 63),
                uint6ToB64((nUint24 >>> 6) & 63),
                uint6ToB64(nUint24 & 63)
            );
            nUint24 = 0;
        }
    }
    return (
        sB64Enc.substring(0, sB64Enc.length - 2 + nMod3) +
        (nMod3 === 2 ? "" : nMod3 === 1 ? "=" : "==")
    );
}

/* UTF-8 array to JS string and vice versa */
/** 
 * Converts a UTF-8 encoded byte array to a JavaScript string.
 * @param aBytes The UTF-8 encoded byte array.
 * @returns The decoded string.
 */
export function UTF8ArrToStr(aBytes: ArrayBuffer | Uint8Array): string
{
    let sView = "";
    let nPart;
    const nLen = aBytes instanceof ArrayBuffer ? aBytes.byteLength : aBytes.length;
    for (let nIdx = 0; nIdx < nLen; nIdx++)
    {
        nPart = aBytes[nIdx];
        sView += String.fromCodePoint(
            nPart > 251 && nPart < 254 && nIdx + 5 < nLen /* six bytes */
                ? /* (nPart - 252 << 30) may be not so safe in ECMAScript! So…: */
                (nPart - 252) * 1073741824 +
                ((aBytes[++nIdx] - 128) << 24) +
                ((aBytes[++nIdx] - 128) << 18) +
                ((aBytes[++nIdx] - 128) << 12) +
                ((aBytes[++nIdx] - 128) << 6) +
                aBytes[++nIdx] -
                128
                : nPart > 247 && nPart < 252 && nIdx + 4 < nLen /* five bytes */
                    ? ((nPart - 248) << 24) +
                    ((aBytes[++nIdx] - 128) << 18) +
                    ((aBytes[++nIdx] - 128) << 12) +
                    ((aBytes[++nIdx] - 128) << 6) +
                    aBytes[++nIdx] -
                    128
                    : nPart > 239 && nPart < 248 && nIdx + 3 < nLen /* four bytes */
                        ? ((nPart - 240) << 18) +
                        ((aBytes[++nIdx] - 128) << 12) +
                        ((aBytes[++nIdx] - 128) << 6) +
                        aBytes[++nIdx] -
                        128
                        : nPart > 223 && nPart < 240 && nIdx + 2 < nLen /* three bytes */
                            ? ((nPart - 224) << 12) +
                            ((aBytes[++nIdx] - 128) << 6) +
                            aBytes[++nIdx] -
                            128
                            : nPart > 191 && nPart < 224 && nIdx + 1 < nLen /* two bytes */
                                ? ((nPart - 192) << 6) + aBytes[++nIdx] - 128
                                : /* nPart < 127 ? */ /* one byte */
                                nPart
        );
    }
    return sView;
}

/** 
 * Converts a JavaScript string to a UTF-8 encoded ArrayBuffer.
 * @param sDOMStr The input string to encode.
 * @returns The UTF-8 encoded ArrayBuffer.
 */
export function strToUTF8Arr(sDOMStr: string): ArrayBuffer 
{
    let nChr;
    const nStrLen = sDOMStr.length;
    let nArrLen = 0;

    /* mapping… */
    for (let nMapIdx = 0; nMapIdx < nStrLen; nMapIdx++)
    {
        nChr = sDOMStr.codePointAt(nMapIdx);

        if (nChr > 65536)
        {
            nMapIdx++;
        }

        nArrLen +=
            nChr < 0x80
                ? 1
                : nChr < 0x800
                    ? 2
                    : nChr < 0x10000
                        ? 3
                        : nChr < 0x200000
                            ? 4
                            : nChr < 0x4000000
                                ? 5
                                : 6;
    }

    const aBytes = new ArrayBuffer(nArrLen);

    /* transcription… */
    let nIdx = 0;
    let nChrIdx = 0;
    while (nIdx < nArrLen)
    {
        nChr = sDOMStr.codePointAt(nChrIdx);
        if (nChr < 128)
        {
            /* one byte */
            aBytes[nIdx++] = nChr;
        } else if (nChr < 0x800)
        {
            /* two bytes */
            aBytes[nIdx++] = 192 + (nChr >>> 6);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else if (nChr < 0x10000)
        {
            /* three bytes */
            aBytes[nIdx++] = 224 + (nChr >>> 12);
            aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
        } else if (nChr < 0x200000)
        {
            /* four bytes */
            aBytes[nIdx++] = 240 + (nChr >>> 18);
            aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
            nChrIdx++;
        } else if (nChr < 0x4000000)
        {
            /* five bytes */
            aBytes[nIdx++] = 248 + (nChr >>> 24);
            aBytes[nIdx++] = 128 + ((nChr >>> 18) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
            nChrIdx++;
        } /* if (nChr <= 0x7fffffff) */ else
        {
            /* six bytes */
            aBytes[nIdx++] = 252 + (nChr >>> 30);
            aBytes[nIdx++] = 128 + ((nChr >>> 24) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 18) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 12) & 63);
            aBytes[nIdx++] = 128 + ((nChr >>> 6) & 63);
            aBytes[nIdx++] = 128 + (nChr & 63);
            nChrIdx++;
        }
        nChrIdx++;
    }

    return aBytes;
}
