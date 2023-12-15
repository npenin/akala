import { State } from '../state.js'
import path from 'node:path'
import { eachAsync } from '@akala/core';
import { ProxyConfiguration } from '@akala/config';
import { register } from 'node:module'

export default async function compile(config: ProxyConfiguration<State>, entryPoints: string[])
{
    if (!config.has('compiler'))
        config.set('compiler', {});
    config = config.get('compiler');
    if (!config.has('loaders'))
    {
        config.set('loaders', {
            protocol: [
                new URL('../loaders/protocol/multi-protocol.js', import.meta.url).toString(),
                new URL('../loaders/protocol/https.js', import.meta.url).toString(),
            ],
            format: [
                new URL('../loaders/format/html-loader.js', import.meta.url).toString(),
                new URL('../loaders/format/ts-loader.js', import.meta.url).toString(),
            ]
        });
        await config.commit()
    }

    config.loaders.protocol.forEach(p => register(p));
    config.loaders.format.forEach(p => register(p));




    await eachAsync(entryPoints, async ep =>
    {
        // const x = await import(ep, { assert: { type: 'json' } });
        const x = await import(ep, { with: { type: 'dependency-tree' } });

        if (path.extname(ep) == '.html')
        {
            console.log(JSON.stringify(x.default, null, 4));
        }

        const y = await import(ep);
        console.log(y);
    });


}