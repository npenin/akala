import { ErrorWithStatus, base64 } from '@akala/core'

export default async function ()
{
    if ('window' in globalThis)
        return base64.base64EncArr(new Uint8Array(await crypto.subtle.digest('sha-256', base64.strToUTF8Arr(navigator.userAgent))));

    throw new ErrorWithStatus(400, 'Not supported');
}