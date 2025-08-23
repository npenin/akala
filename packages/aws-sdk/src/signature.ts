import { base64, type HttpOptions } from "@akala/core";
// import crypto from 'crypto'

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
    return async function <T extends RequestInit | HttpOptions<unknown>>(url: URL | string, request: T)
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
                return (url as URL).hostname;
            if (!request.headers)
                request.headers = {};
            if (Array.isArray(request.headers))
            {
                const header = request.headers.find(h => h[0] == name)
                return header?.[1];
            }
            else if (request.headers instanceof Headers)
                request.headers.get(name);
            else
                return request.headers[name].toString();
        }

        const now = new Date().toJSON();
        const amz_date = now.replace(/[-:]/g, "").replace(/\.\d*/, "");
        const date_stamp = now.replace(/-/g, "").replace(/T.*/, "");
        const key = await generateKey(amz_date);
        setHeader('x-amz-date', amz_date);

        const signed_headers = ['content-type', 'host', 'x-amz-date'];

        const canonical_headers = signed_headers.map(x => x + ':' + getHeader(x)).join('\n');
        // const signedHeaders = await crypto.subtle.sign(algo, key, encoder.encode(canonical_headers))
        let payload: BufferSource;
        if (typeof request.body == 'string')
            payload = encoder.encode(request.body);
        else if (request.body instanceof Blob)
            payload = await request.body.arrayBuffer();
        else if (request.body instanceof ArrayBuffer)
            payload = request.body;
        else if (ArrayBuffer.isView(request.body))
            payload = request.body as ArrayBufferView<ArrayBuffer>;
        else if (request.body instanceof URLSearchParams)
            payload = encoder.encode(request.body.toString());
        else
        {
            const body = request.body = JSON.stringify(request.body);
            payload = encoder.encode(body);
        }

        const payloadHash = await crypto.subtle.digest('SHA256', payload)
        const canonical_request = request.method + "\n" + url.pathname + "\n" + url.search + "\n" + canonical_headers + "\n" + signed_headers.join(';') + "\n" + base64.base64EncArr(new Uint8Array(payloadHash));

        const algorithm = 'AWS4-HMAC-SHA256';
        const credential_scope = date_stamp + "/" + region + "/" + service + "/" + "aws4_request";
        const string_to_sign = algorithm + "\n" + amz_date + "\n" + credential_scope + "\n" + await crypto.subtle.digest('sha256', encoder.encode(canonical_request))

        const signature = await crypto.subtle.sign(algo, key, encoder.encode(string_to_sign))
        const authorization_header = algorithm + ' ' + 'Credential=' + accessKey + '/' + credential_scope + ', ' + 'SignedHeaders=' + signed_headers + ', ' + 'Signature=' + base64.base64EncArr(new Uint8Array(signature))

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
