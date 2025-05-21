import { FSFileSystemProvider } from './fs.js';
import fsHandler from './index.browser.js';

export * from './index.browser.js';

fsHandler.useProtocol('file', async url => new FSFileSystemProvider(url, false))
fsHandler.useProtocol('npm', async url =>
{
    const fragments = url.pathname.split('/');
    const packageName = fragments[1][0] == '@' ? fragments.slice(1, 3).join('/') : fragments[1];
    const resolvedUrl = import.meta.resolve(url.pathname.substring(1));
    const root = resolvedUrl.substring(0, resolvedUrl.length - url.pathname.length + packageName.length + 2);
    const fs = new FSFileSystemProvider(new URL(root), true);
    fs.resolvePath = path =>
    {
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
    return fs;
});
export default fsHandler;
