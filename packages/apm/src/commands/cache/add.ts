import { ErrorWithStatus, HttpStatusCode, packagejson } from "@akala/core";
import { type State } from "../../state.js";
import { handler, workspaceCache } from "../../registry.js";
import { FileType, readTgzEntries } from "../../tar.js";
import { dirname } from 'path/posix'
import { type FileSystemProvider } from "@akala/fs";
import { type LockPackage } from "../../lockfile.js";

export async function getPackageCachePath(state: State, pkg: URL, pkgJson?: packagejson.CoreProperties | LockPackage): Promise<URL>
{
    if (!pkgJson)
        pkgJson = await handler.process(pkg, state);
    if (pkg.hostname)
        return new URL(`${pkg.protocol.substring(0, pkg.protocol.length - 1)}-${pkg.hostname}-${pkgJson.name}-${pkgJson.version}/`, state.cacheFolder.root);
    else
        return new URL(`${pkg.protocol.substring(0, pkg.protocol.length - 1)}-${pkgJson.name}-${pkgJson.version}/`, state.cacheFolder.root)
}

export async function getPackageCacheFolder(state: State, pkg: URL, pkgJson?: packagejson.CoreProperties | LockPackage): Promise<FileSystemProvider>
{
    return this.cacheFolder.newChroot(await getPackageCachePath(state, pkg, pkgJson))
}

export default async function (this: State, pkg: string | URL, force?: boolean): Promise<packagejson.CoreProperties>
{
    if (typeof pkg == 'string' && !URL.canParse(pkg))
        throw new Error('only URLs are supported');

    pkg = new URL(pkg);

    await this.fs.mkdir('./.cache/apm', { recursive: true });

    this.logger.debug('checking whether %s is in cache...', pkg);

    const pkgJson = await handler.process(pkg, this);
    const pkgPath = await getPackageCachePath(this, pkg, pkgJson);

    try
    {
        await this.cacheFolder.stat(pkgPath);
        if (!force)
            return;
    }
    catch (e)
    {
        if (e.statusCode !== HttpStatusCode.NotFound)
            throw e;
    }


    let packageFolder: FileSystemProvider;
    await this.cacheFolder.mkdir(pkgPath, { recursive: true });

    if (pkg.protocol === 'workspace:')
    {
        //on purpose creating and removing to handle scoped packages
        await this.cacheFolder.rmdir(pkgPath);
        this.logger.debug(`Symlinking ${pkg}...`)
        await this.fs.symlink(new URL(pkgPath), workspaceCache[pkg.toString()].fsPath);
        return;
    }

    packageFolder = this.cacheFolder.newChroot(pkgPath);

    this.logger.debug('downloading %s', pkgJson.dist.tarball);
    const res = await fetch(pkgJson.dist.tarball);

    const tar = await res.arrayBuffer();

    let skip = 0;
    let previousEntry;
    for (const entry of await readTgzEntries(Buffer.from(tar)))
    {
        if (skip)
        {
            skip--;
            continue;
        }
        let path = `${entry.prefix}${entry.fileName}`;
        if (path.startsWith('package/'))
            path = path.substring('package'.length + 1);
        if (path.startsWith('node/'))
            path = path.substring('node'.length + 1);
        switch (entry.typeFlag)
        {
            case FileType.Directory:
            case 'd':
                await packageFolder.mkdir(path, { recursive: true });
                break;
            case FileType.File:
            case '\0':
                {

                    const parent = dirname(path);

                    await packageFolder.mkdir(parent + '/', { recursive: true });
                    await packageFolder.writeFile(path, entry.data);
                    break;
                }
            case FileType.SymbolicLink:
                {
                    const parent = dirname(path);
                    await packageFolder.mkdir(parent + '/', { recursive: true });
                    if (entry.linkName.startsWith('/'))
                        entry.linkName = entry.linkName.substring(1);
                    await packageFolder.symlink(path, entry.linkName);
                    break;
                } case 'x':
                continue;
            case 'O':
            case 'e':
            case 'g':
                this.logger.warn(`Unknown tar typeflag: '${entry.typeFlag}' at path ${path} in ${pkgJson.dist.tarball}`);
                this.logger.warn(entry);
                skip++;
                break;
            default:
                this.logger.warn(`Unknown tar typeflag: '${entry.typeFlag}' at path ${path} in ${pkgJson.dist.tarball}`);
                console.log(previousEntry);
                console.log(entry);
                throw new ErrorWithStatus(HttpStatusCode.NotImplemented);
        }
        previousEntry = entry;
    }

    return pkgJson;
}
