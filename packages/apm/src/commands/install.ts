import { type FileHandle, OpenFlags } from "@akala/fs";
import { type LockFile, resolve, snapshot } from "../lockfile.js";
import { closest, type State } from "../state.js";
import Cache from "../cache.js";
import { versionParser } from "../registry.js";
import { HttpStatusCode, packagejson, throttle } from "@akala/core";
import { getPackageCachePath } from "./cache/add.js";

export default async function install(this: State, signal: AbortSignal, pkgSpecifier?: string | URL, version?: string, save?: boolean | 'dev' | 'peer' | 'optional' | 'test')
{
    if (typeof save === 'undefined')
        save = true;


    let lockFile: FileHandle;
    let lock: LockFile;

    try
    {
        lockFile = await closest(this.fs, 'apm.lock');

        lock = JSON.parse(await lockFile.readFile('utf-8'));
    }
    catch (e)
    {
        if (e.statusCode === 404)
            lockFile = await this.fs.open('apm.lock', OpenFlags.Write);

        lock = { __metadata: { version: 0 }, packages: {} };
    }

    const cache = Cache(this);

    let pkgFile: FileHandle;
    let currentPkg: packagejson.CoreProperties;


    const throttler = throttle<void>(Number.POSITIVE_INFINITY);
    const promises: Promise<void>[] = [];
    const cachePromises: Promise<void>[] = [];

    try
    {
        pkgFile = await closest(this.fs, 'package.json');
        currentPkg = JSON.parse(await pkgFile.readFile('utf-8'));
        currentPkg.resolution = `workspace:${currentPkg.name}/${currentPkg.version}`
    }
    catch (e)
    {
        pkgFile = await this.fs.open('package.json', OpenFlags.ReadWrite | OpenFlags.Truncate);
    }

    if (pkgSpecifier)
    {
        const pkg = await cache.add(pkgSpecifier);

        lock = await snapshot(pkg, this, lock, false, {
            addPkg: async pkg =>
            {
                cachePromises.push(throttler(async () =>
                {
                    await (typeof pkg.resolution === 'string' ?
                        cache.add(new URL(pkg.resolution as string)) :
                        cache.add(new URL((pkgSpecifier as URL).protocol + pkg.name + '/' + pkg.version, pkgSpecifier as URL)))
                }))
            }
        }, signal);

        await lockFile.writeFile(JSON.stringify(lock));

        if (!(pkgSpecifier instanceof URL))
            pkgSpecifier = URL.canParse(version) ? new URL(version) : new URL(`npm:${pkgSpecifier}/${version}`);

        if (version)
        {
            const parsedVersion = version.match(versionParser);
            version = parsedVersion.groups.range + pkg.version;
        }
        else
            version = pkg.version;

        if (save)
        {
            switch (save)
            {
                case true:
                    currentPkg.dependencies[pkg.name] = version;
                    lock.packages[currentPkg.name].dependencies[pkg.name] = version;
                    break;
                case 'dev':
                    currentPkg.devDependencies[pkg.name] = version;
                    lock.packages[currentPkg.name].devDependencies[pkg.name] = version;
                    break;
                case 'peer':
                    currentPkg.peerDependencies[pkg.name] = version;
                    lock.packages[currentPkg.name].peerDependencies[pkg.name] = version;
                    break;
                case 'optional':
                    currentPkg.optionalDependencies[pkg.name] = version;
                    lock.packages[currentPkg.name].optionalDependencies[pkg.name] = version;
                    break;
                case 'test':
                    currentPkg.testDependencies[pkg.name] = version;
                    lock.packages[currentPkg.name].testDependencies[pkg.name] = version;
                    break;
            }

            await pkgFile.writeFile(JSON.stringify(pkg));
        }
    }
    else
    {
        lock = await snapshot(currentPkg, this, lock, false, {
            addPkg: async pkg =>
            {
                if (pkg !== currentPkg)
                    if (typeof pkg.resolution === 'string')
                        cachePromises.push(throttler(async () => { await cache.add(new URL(pkg.resolution as string)) }));
                    else
                        cachePromises.push(throttler(async () => { await cache.add('npm:' + pkg.name + '/' + pkg.version) }))
            },
        }, signal);

        await Promise.all(promises);
        this.logger.debug('Lock file updated, waiting for package cache (' + promises.length + ', ' + cachePromises.length + ') to be updated...');
        let previousLength = 0;
        while (cachePromises.length > 0 && cachePromises.length !== previousLength)
        {
            previousLength = cachePromises.length;
            await Promise.all(cachePromises);
        }
        this.logger.debug('Lock file updated, writing to disk...');
        if (signal.aborted)
            signal.throwIfAborted();
        await lockFile.writeFile(JSON.stringify(lock));
    }

    await lockFile.close();
    await pkgFile?.close();

    // return;

    const modulesFolder = new URL('./node_modules2/', this.fs.root);
    await this.fs.mkdir(modulesFolder, { recursive: true });

    const linkPromises = [];

    for (const pkg of Object.values(lock.packages))
    {
        const resolution = typeof pkg.resolution === 'string' ? new URL(pkg.resolution) : new URL(`npm:${pkg.name}/${pkg.version}`);

        linkPromises.push(getPackageCachePath(this, resolution, pkg).then(async pkgPath =>
        {
            for (const depType of ['dependencies', 'optionalDependencies'] as const)
            {
                if (!pkg[depType])
                    continue;

                await this.cacheFolder.mkdir(new URL('node_modules2/', pkgPath), { recursive: true });
                for (const dep in pkg[depType])
                {
                    signal.throwIfAborted();
                    const depUrl = new URL(pkg[depType][dep]);
                    this.logger.debug(`Creating symlink for ${depUrl} in ${pkgPath}`);
                    if (lock.packages[depUrl.toString()] === undefined)
                        if (depType == 'optionalDependencies')
                            continue;
                        else
                            throw new Error(`Package ${dep} not found in lock file`);
                    const linkSource = new URL(`node_modules2/${lock.packages[depUrl.toString()].name}`, pkgPath);
                    try
                    {
                        const indexOfSlash = lock.packages[depUrl.toString()].name.indexOf('/');
                        if (indexOfSlash !== -1)
                            await this.cacheFolder.mkdir(new URL('./', linkSource), { recursive: true });
                        await this.cacheFolder.symlink(linkSource, await getPackageCachePath(this, depUrl, lock.packages[dep]), 'dir');
                    }
                    catch (e)
                    {
                        if (e.statusCode == HttpStatusCode.NotFound && depType == 'optionalDependencies')
                            continue;
                        if (e.statusCode !== HttpStatusCode.Conflict)
                            throw e;
                    }

                }
            }
        }));
    }

    const dependencies = [
        'dependencies',
        'devDependencies',
        'peerDependencies',
        'optionalDependencies',
        'testDependencies'
    ] as const;

    for (const depType of dependencies)
    {
        if (!currentPkg[depType])
            continue;

        for (const dep in currentPkg[depType] as packagejson.Dependency)
        {
            signal.throwIfAborted();
            const version = currentPkg[depType][dep];
            linkPromises.push(resolve(this, dep, version).then(async depUrl =>
            {
                this.logger.debug(`Creating symlink for ${depUrl.url.pathname} in ${modulesFolder}`);
                if (depUrl.pkgJson?.bin)
                {
                    await this.fs.mkdir(new URL('.bin/', modulesFolder), { recursive: true });
                    for (const bin in depUrl.pkgJson.bin || {})
                    {
                        try
                        {
                            await this.fs.symlink(new URL('.bin/' + bin, modulesFolder), new URL(depUrl.pkgJson.bin[bin], await getPackageCachePath(this, depUrl.url, lock.packages[depUrl.toString()] || depUrl.pkgJson)));
                        }
                        catch (e)
                        {
                            if (e.statusCode !== HttpStatusCode.Conflict)
                                throw e;
                        }

                    }
                }
                const linkSource = new URL(`${depUrl.pkgJson.name}`, modulesFolder);
                try
                {
                    await this.fs.symlink(linkSource, await getPackageCachePath(this, depUrl.url, lock.packages[depUrl.toString()] || depUrl.pkgJson), 'dir');
                }
                catch (e)
                {
                    if (e.statusCode !== HttpStatusCode.Conflict)
                        throw e;
                }
            }));
        }
    }

    await Promise.all(linkPromises);
}
