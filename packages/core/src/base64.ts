///
/// Native/portable equivalents with the same public surface
///

import { IsomorphicBuffer } from "./helpers.js";

// --- Base64 utils ---

export function base64ByteLength(sBase64: string, nBlocksSize?: number): number
{
    // Keep original semantics: strip everything except Base64 alphabet (no '=')
    const sB64Enc = sBase64.replace(/[^A-Za-z0-9+/]/g, "");
    const nInLen = sB64Enc.length;

    // Original MDN math: floor((nInLen * 3 + 1) / 4)
    const bytes = (nInLen * 3 + 1) >> 2;

    return nBlocksSize
        ? Math.ceil(bytes / nBlocksSize) * nBlocksSize
        : bytes;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Decodes a Base64 string into a Uint8Array.
 * @param sBase64 The Base64 encoded string.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The decoded byte array.
 */
export function base64DecToArr(sBase64: string)
{
    const clean = sBase64.replace(/[^A-Za-z0-9+/]/g, "");

    if (typeof Buffer !== "undefined")
        return new Uint8Array(Buffer.from(clean, "base64"));
    else
    {
        const length = Math.floor(clean.length * 3 / 4);
        const out = new Uint8Array(length);

        let j = 0;
        for (let i = 0; i < clean.length; i += 4)
        {
            const n0 = BASE64_CHARS.indexOf(clean[i]);
            const n1 = BASE64_CHARS.indexOf(clean[i + 1]);
            const n2 = BASE64_CHARS.indexOf(clean[i + 2]);
            const n3 = BASE64_CHARS.indexOf(clean[i + 3]);

            const triplet = (n0 << 18) | (n1 << 12) | ((n2 & 63) << 6) | (n3 & 63);

            if (j < out.length) out[j++] = (triplet >> 16) & 0xFF;
            if (j < out.length) out[j++] = (triplet >> 8) & 0xFF;
            if (j < out.length) out[j++] = triplet & 0xFF;
        }

        return out;
    }
}

/**
 * Encodes an ArrayBuffer/Uint8Array to Base64URL format.
 * @param aBytes The byte array to encode.
 * @returns The Base64URL encoded string.
 */
export function base64UrlEncArr(aBytes: Uint8Array): string
{
    const s = base64EncArr(aBytes).replace(/\+/g, "-").replace(/\//g, "_");
    return s.replace(/=+$/g, "");
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64URL format.
 * @param aBytes The byte array to encode.
 * @returns The Base64URL encoded string.
 */
export function base64UrlEncIsomorphicBuffer(aBytes: IsomorphicBuffer): string
{
    let s = base64EncIsomorphicBuffer(aBytes).replace(/\+/g, '-').replace(/\//g, '_');
    while (s.endsWith('='))
        s = s.substring(0, s.length - 1);
    return s;
}

/**
 * Decodes a Base64URL string into an ArrayBuffer/Uint8Array.
 * @param s The Base64URL encoded string.
 * @returns The decoded byte array.
 */
export function base64UrlDecToArr(s: string): Uint8Array
{
    let t = s.replace(/-/g, "+").replace(/_/g, "/").replace(/\s+/g, "");
    const rem = t.length % 4;
    if (rem === 2) t += "==";
    else if (rem === 3) t += "=";
    else if (rem === 1) throw new Error("Invalid Base64URL length");
    return base64DecToArr(t);
}

// --- PEM helpers (same names/signatures) ---


/** 
 * Extracts the binary content from a PEM-formatted private key.
 * @param pem The PEM string containing the private key.
 * @returns The decoded binary content of the private key.
 */
export function extractPrivateKey(pem: string): Uint8Array
{
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const start = pem.indexOf(pemHeader);
    const end = pem.indexOf(pemFooter);
    if (start < 0 || end < 0 || end <= start)
        throw new Error("Invalid PRIVATE KEY PEM");
    const body = pem.slice(start + pemHeader.length, end).replace(/\s+/g, "");
    return base64DecToArr(body);
}

/** 
 * Extracts the binary content from a PEM-formatted public key.
 * @param pem The PEM string containing the public key.
 * @returns The decoded binary content of the public key.
 */
export function extractPublicKey(pem: string): Uint8Array
{
    const pemHeader = "-----BEGIN PUBLIC KEY-----";
    const pemFooter = "-----END PUBLIC KEY-----";
    const start = pem.indexOf(pemHeader);
    const end = pem.indexOf(pemFooter);
    if (start < 0 || end < 0 || end <= start)
        throw new Error("Invalid PUBLIC KEY PEM");
    const body = pem.slice(start + pemHeader.length, end).replace(/\s+/g, "");
    return base64DecToArr(body);
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64 string.
 * @param aBytes The byte array to encode.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The Base64 encoded string.
 */
export function base64EncArr(aBytes: Uint8Array, nBlocksSize?: number): string
{
    let out: string;
    if (typeof Buffer !== "undefined")
        // Node, Bun
        out = Buffer.from(aBytes).toString("base64");
    else
    {
        out = "";
        let i = 0;
        while (i < aBytes.length)
        {
            const byte1 = aBytes[i++]!;
            const byte2 = i < aBytes.length ? aBytes[i++]! : 0;
            const byte3 = i < aBytes.length ? aBytes[i++]! : 0;

            const triplet = (byte1 << 16) | (byte2 << 8) | byte3;

            out += BASE64_CHARS[(triplet >> 18) & 63];
            out += BASE64_CHARS[(triplet >> 12) & 63];
            out += i - 2 <= aBytes.length ? BASE64_CHARS[(triplet >> 6) & 63] : "=";
            out += i - 1 <= aBytes.length ? BASE64_CHARS[triplet & 63] : "=";
        }
    }

    if (nBlocksSize && nBlocksSize > 0)
    {
        let s = "";
        for (let j = 0; j < out.length; j += nBlocksSize)
        {
            s += out.slice(j, j + nBlocksSize) + "\n";
        }
        out = s.trimEnd();
    }

    return out;
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64 string.
 * @param aBytes The byte array to encode.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The Base64 encoded string.
 */
export function base64EncArrBuff(aBytes: ArrayBuffer, nBlocksSize?: number): string
{
    return base64EncArr(new Uint8Array(aBytes), nBlocksSize);
}

/** 
 * Encodes an ArrayBuffer/Uint8Array to Base64 string.
 * @param aBytes The byte array to encode.
 * @param nBlocksSize Optional size for line breaks in the output.
 * @returns The Base64 encoded string.
 */
export function base64EncIsomorphicBuffer(aBytes: IsomorphicBuffer, nBlocksSize?: number): string
{
    return base64EncArr(aBytes.toArray(), nBlocksSize);
}

// --- UTF-8 (native encoders/decoders) ---

/* UTF-8 array to JS string and vice versa */
/** 
 * Converts a UTF-8 encoded byte array to a JavaScript string.
 * @param aBytes The UTF-8 encoded byte array.
 * @returns The decoded string.
 */
export function UTF8ArrToStr(aBytes: Uint8Array): string
{
    return new TextDecoder("utf-8").decode(aBytes);
}

/**
 * IsomorphicBuffer UTF-8 -> string (same name/signature).
 */

/* UTF-8 array to JS string and vice versa */
/** 
 * Converts a UTF-8 encoded byte array to a JavaScript string.
 * @param aBytes The UTF-8 encoded byte array.
 * @returns The decoded string.
 */
export function UTF8IsomorphicBufferToStr(aBytes: IsomorphicBuffer): string
{
    return UTF8ArrToStr(aBytes.toArray());
}

/**
 * Compute UTF-8 byte length for a JS string (same name/signature).
 * Uses correct UTF-8 ranges (1–4 bytes).
 */
export function strUTF8ByteLength(sDOMStr: string): number
{
    let bytes = 0;
    for (let i = 0; i < sDOMStr.length; i++)
    {
        const cp = sDOMStr.codePointAt(i)!;
        if (cp <= 0x7F) bytes += 1;
        else if (cp <= 0x7FF) bytes += 2;
        else if (cp <= 0xFFFF) bytes += 3;
        else { bytes += 4; i++; } // surrogate pair consumed
    }
    return bytes;
}

/**
 * Converts a JavaScript string to a UTF-8 encoded ArrayBuffer.
 * @param sDOMStr The input string to encode.
 * @returns The UTF-8 encoded ArrayBuffer.
 */
export function strToUTF8Arr(sDOMStr: string)
{
    return new TextEncoder().encode(sDOMStr) as Uint8Array<ArrayBuffer>;
}
