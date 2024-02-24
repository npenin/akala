// import crypto from 'crypto'

import { base64ArrayBuffer } from "./base64Encoder";

const algo = { name: 'HMAC', hash: 'SHA-256' }
export function sign(accessKey: string, region: string, service: string)
{
    const encoder = new TextEncoder();
    async function generateKey(date: string)
    {
        let key = await crypto.subtle.importKey('raw', encoder.encode("AWS4" + accessKey), algo, false, ['sign'])
        const dateKey = await crypto.subtle.sign(algo, key, encoder.encode(date))
        key = await crypto.subtle.importKey('raw', dateKey, algo, false, ['sign'])
        const dateRegionKey = await crypto.subtle.sign(algo, key, encoder.encode(region))
        key = await crypto.subtle.importKey('raw', dateRegionKey, algo, false, ['sign'])
        const dateRegionServiceKey = await crypto.subtle.sign(algo, key, encoder.encode(service))
        key = await crypto.subtle.importKey('raw', dateRegionServiceKey, algo, false, ['sign'])
        const signingKey = await crypto.subtle.sign(algo, key, encoder.encode('aws4_request'))
        key = await crypto.subtle.importKey('raw', signingKey, algo, false, ['sign'])
        return key;
    }
    return async function (url: URL | string, request: RequestInit)
    {
        if (request.body instanceof ReadableStream || request.body instanceof FormData)
            throw new Error('Not supported')

        if (typeof (url) == 'string')
            url = new URL(url);

        function setHeader(name: string, value: string)
        {
            if (!request.headers)
                request.headers = {};
            if (Array.isArray(request.headers))
                request.headers.push([name, value]);
            else if (request.headers instanceof Headers)
                request.headers.append(name, value);
            else
                request.headers[name] = value;
        }
        function getHeader(name: string): string
        {
            if (name == 'host')
                return (url as URL).host;
            if (!request.headers)
                request.headers = {};
            if (Array.isArray(request.headers))
            {
                const header = request.headers.find(h => h[0] == name)
                return header && header[1];
            }
            else if (request.headers instanceof Headers)
                request.headers.get(name);
            else
                return request.headers[name];
        }

        var now = new Date().toJSON();
        const amz_date = now.replace(/[-:]/g, "").replace(/\.[0-9]*/, "");
        const date_stamp = now.replace(/-/g, "").replace(/T.*/, "");
        const key = await generateKey(amz_date);
        setHeader('x-amz-date', amz_date);

        const signed_headers = ['content-type', 'host', 'x-amz-date'];

        const canonical_headers = signed_headers.map(x => x + ':' + getHeader(x)).join('\n');
        // const signedHeaders = await crypto.subtle.sign(algo, key, encoder.encode(canonical_headers))
        const payloadHash = await crypto.subtle.digest('SHA256', typeof request.body == 'string' ? encoder.encode(request.body) : request.body instanceof Blob ? await request.body.arrayBuffer() : request.body instanceof URLSearchParams ? encoder.encode(request.body.toString()) : request.body)
        const canonical_request = request.method + "\n" + url.pathname + "\n" + url.search + "\n" + canonical_headers + "\n" + signed_headers.join(';') + "\n" + base64ArrayBuffer(payloadHash);

        const algorithm = 'AWS4-HMAC-SHA256';
        const credential_scope = date_stamp + "/" + region + "/" + service + "/" + "aws4_request";
        const string_to_sign = algorithm + "\n" + amz_date + "\n" + credential_scope + "\n" + await crypto.subtle.digest('sha256', encoder.encode(canonical_request))

        const signature = await crypto.subtle.sign(algo, key, encoder.encode(string_to_sign))
        const authorization_header = algorithm + ' ' + 'Credential=' + accessKey + '/' + credential_scope + ', ' + 'SignedHeaders=' + signed_headers + ', ' + 'Signature=' + base64ArrayBuffer(signature)

        setHeader('authorization', authorization_header);
        // setHeader('signed_headers', date);



        return request;
    }
}

export async function jsonSimpleService<TInput, TOutput extends object>(path: string, accessKey: string, service: string, region: string, body: TInput): Promise<{ $metadata: Response } & TOutput>
{
    const url = new URL(`https://${service}.${region}.amazonaws.com${path}`);
    const result = await sign(accessKey, region, service)(url, { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });
    const res = await fetch(url, result);

    return { $metadata: res, ...await res.json() };
}