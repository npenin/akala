import { get } from 'node:https';
import { Resolver, ResolverResult } from '../../index.js';
import fs from 'node:fs'
import path from 'path'

export const resolve: Resolver = async function (url, context, nextResolve)
{
    // For JavaScript to be loaded over the network, we need to fetch and
    // return it.
    if (url.startsWith('https://'))
    {
        await fs.promises.mkdir('.akala/https-cache', { recursive: true })
        const filePath = path.resolve('.akala/https-cache/' + url.replaceAll(/[\/:?#]/g, '-'));
        return new Promise<ResolverResult>((resolve, reject) =>
        {
            fs.promises.access(filePath).then(() => resolve(nextResolve(filePath, context)), e =>
            {
                if (e.code = 'ENOENT')
                {
                    console.error(`${url} not found in cache, downloading...`)
                    get(url, res => res.pipe(fs.createWriteStream(filePath)).on('close', () => resolve(nextResolve(filePath, context)))).on('error', (err) => reject(err));
                }
            });
        });
    }

    // Let Node.js handle all other URLs.
    return nextResolve(url);
} 