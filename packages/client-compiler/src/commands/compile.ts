import { State } from '../state.js'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { spawnAsync } from '@akala/pm'
import { eachAsync } from '@akala/core';
import { ProxyConfiguration } from '@akala/config';
import { renderOuter } from '@akala/pages';
import vm from 'node:vm'

export default async function compile(config: ProxyConfiguration<State>, entryPoints: string[])
{
    if (!config.has('compiler'))
        config.set('compiler', {});
    config = config.get('compiler');
    if (!config.has('loaders'))
    {
        config.set('loaders', { protocol: [fileURLToPath(new URL('../loaders/protocol/https.js', import.meta.url))], format: [fileURLToPath(new URL('../loaders/format/html-loader.js', import.meta.url))] });
        await config.commit()
    }
    if (!~process.execArgv.indexOf('--experimental-loader'))
    //TODO: has to use spawn until node can support dynamic ESM loaders
    {
        const cp = await spawnAsync(process.execPath, { stdio: 'inherit', shell: true }, ...config.loaders.format.map(e => ['--experimental-loader', e]).flat(), ...config.loaders.protocol.map(e => ['--experimental-loader', e]).flat(), ...process.argv.slice(1));
        return;
    }

    await eachAsync(entryPoints, async ep =>
    {
        // const x = await import(ep, { assert: { type: 'json' } });
        const x = await import(ep);
        if (path.extname(ep) == '.html')
        {
            console.log(x.default(renderOuter, '')[0]);
        }
    });
}