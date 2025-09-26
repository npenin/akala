import { IsomorphicBuffer } from '@akala/core';
import { FSFileSystemProvider } from './fs.js';
import fsHandler, { FileSystemProviderProxy, OpenFlags } from './index.browser.js';
import { dirname } from 'path/posix'

export * from './index.browser.js';
export { FSFileSystemProvider };

fsHandler.useProtocol('file', async url => new FSFileSystemProvider(url, false))
fsHandler.useProtocol('npm', async url =>
{
    const fragments = url.pathname.split('/');
    let offset = 0;
    if (fragments[0] === '')
    {
        fragments.shift();
        offset++;
    }
    if (fragments[fragments.length - 1] === '')
    {
        fragments.pop();
        offset++;
    }
    const packageName = (fragments[0][0] == '@') ? fragments.slice(0, 2).join('/') : fragments[0];

    let fs: FSFileSystemProvider;
    if (packageName.length + offset == url.pathname.length)
    {
        const resolvedUrl = import.meta.resolve(packageName);
        fs = new FSFileSystemProvider(new URL(resolvedUrl), true);
        while (!await fs.access('./package.json').then(() => true, () => false))
        {
            fs.chroot(new URL(dirname(fs.root.toString()) + '/'))
        }
    }
    else
    {
        const resolvedUrl = import.meta.resolve(`${packageName}${url.pathname.substring(packageName.length + offset)}`);
        fs = new FSFileSystemProvider(new URL(resolvedUrl), true);
        while (!await fs.access('./package.json').then(() => true, () => false))
        {
            fs.chroot(new URL(dirname(fs.root.toString()) + '/'))
        }
    }
    fs.resolvePath = path =>
    {
        if (fs.isFileHandle(path))
            path = path.path;
        if (URL.canParse(path))
            path = new URL(path);
        if (path instanceof URL)
        {
            if (path.protocol == 'npm:' && path.pathname.startsWith('/' + packageName))
            {
                path = path.pathname.substring(packageName.length + 2)
            }
        }
        return FSFileSystemProvider.prototype.resolvePath.call(fs, path);
    }

    const fakeNpm = new FileSystemProviderProxy(fs);
    fakeNpm.root = new URL('npm:///' + packageName + '/');

    return fakeNpm;
});
export default fsHandler;

// WARNING: Duplicated implementation in index.browser because of pathToFileURL import requirement in nodejs
import { pathToFileURL } from 'url';

export async function openFile(filePath: string | URL, flags: OpenFlags)
{
    if (typeof filePath == 'string')
        if (URL.canParse(filePath))
            filePath = new URL(filePath);
        else
            filePath = pathToFileURL(filePath);

    const fs = await fsHandler.process(filePath);
    return await fs.open(filePath, flags)
}

export function readFile(filePath: string | URL, encoding: Exclude<BufferEncoding, 'binary'>, flags?: OpenFlags): Promise<string>;
export function readFile(filePath: string | URL, encoding: 'binary', flags?: OpenFlags): Promise<IsomorphicBuffer>;
export function readFile<T>(filePath: string | URL, encoding: 'json', flags?: OpenFlags): Promise<T>;
export function readFile<T>(filePath: string | URL, encoding: 'json' | BufferEncoding, flags?: OpenFlags): Promise<T | IsomorphicBuffer | string>;
export async function readFile(filePath: string | URL, encoding?: BufferEncoding | 'json', flags?: OpenFlags)
{
    const f = await openFile(filePath, typeof flags === 'undefined' ? OpenFlags.Read : flags)
    const result = f.readFile(encoding);
    await f.close();
    return result;
}

export async function writeFile(filePath: string | URL, data: unknown, encoding?: BufferEncoding | 'json', flags?: OpenFlags): Promise<void>
{
    const f = await openFile(filePath, typeof flags === 'undefined' ? OpenFlags.Write : flags)
    const result = f.writeFile(data, encoding);
    await f.close();
    return result;
}
