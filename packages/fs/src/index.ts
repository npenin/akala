import { FSFileSystemProvider } from './fs.js';
import fsHandler, { FileSystemProviderProxy } from './index.browser.js';
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
        fs = new FSFileSystemProvider(new URL(import.meta.resolve(`${packageName}${url.pathname.substring(packageName.length + offset)}`)), true);

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
