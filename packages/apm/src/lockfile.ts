import { ErrorWithStatus, HttpStatusCode, packagejson } from "@akala/core";
import { handler } from "./registry.js";
import { State } from "./state.js";

export interface LockFile
{
    __metadata: { version: number }

    packages: Record<string, LockPackage>
};

export interface LockPackage
{
    name: string,
    version: string,
    resolution: string,
    bin?: { name: string, path: string }[],
    dependencies?: packagejson.Dependency,
    devDependencies?: packagejson.Dependency,
    testDependencies?: packagejson.Dependency,
    peerDependencies?: packagejson.Dependency,
    optionalDependencies?: packagejson.Dependency
}

export function pkgKey(pkg: packagejson.CoreProperties | LockPackage)
{
    return typeof pkg.resolution == 'string' ? pkg.resolution : 'npm:' + pkg?.name + '/' + pkg?.version
}

export async function resolve(state: State, pkg: string, version: string, pkgJson?: packagejson.CoreProperties | LockPackage): Promise<{ pkgJson: packagejson.CoreProperties | LockPackage, url: URL }>
{
    if (URL.canParse(version))
        return { pkgJson, url: new URL(version) };

    if (!pkgJson)
        pkgJson = await handler.process(new URL(`npm:${pkg}/${version}`), state);

    return { pkgJson, url: new URL(`npm:${pkgJson.name}/${pkgJson.version}`) };
}

/**
 * Improved version of snapshot that handles concurrency and race conditions
 * @returns Promise<LockFile> A promise that resolves to the complete lock file
 */
export async function snapshot(pkg: packagejson.CoreProperties | LockPackage, state: State, lock?: LockFile, frozen?: boolean, events?: {
    addPkg?(pkg: packagejson.CoreProperties | LockPackage): Promise<void> | void,
    walkDep?(specifier: string, version: string, uri: URL, parent: packagejson.CoreProperties | LockPackage): Promise<void>
}, signal?: AbortSignal): Promise<LockFile>
{
    // Initialize lock file if not provided
    if (!lock)
    {
        lock = {
            __metadata: { version: 0 },
            packages: {}
        };
    }

    if (frozen)
    {
        throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'This would modify the frozen lock file.');
    }

    // Process package and its dependencies in parallel with proper dependency tracking
    async function processPackage(
        currentPkg: packagejson.CoreProperties | LockPackage,
        visited: Set<string> = new Set(),
        skipDevDeps = false
    ): Promise<void>
    {
        const key = currentPkg ? pkgKey(currentPkg) : '';

        // Skip if already processed
        if (visited.has(key))
        {
            return;
        }
        visited.add(key);

        // Check abort signal
        signal?.throwIfAborted();

        // Add package to lock file atomically
        if (!(key in lock.packages))
        {
            await events?.addPkg?.(currentPkg);

            lock.packages[key] = {
                name: currentPkg.name,
                version: currentPkg.version,
                resolution: key,
                bin: currentPkg.bin ? Object.entries(currentPkg.bin).map(([name, path]) => ({ name, path })) : undefined,
            };

            if ('workspaces' in currentPkg)
                for await (const workspace of state.fs.glob(currentPkg.workspaces))
                {
                    try
                    {
                        const wspacePkg = await state.fs.readFile<packagejson.CoreProperties>(new URL(workspace, 'package.json'), { encoding: 'json' });

                        wspacePkg.resolution = `workspace:${wspacePkg.name}/${wspacePkg.version}`

                        await snapshot(wspacePkg, state, lock, frozen, events, signal);
                    }
                    catch (e)
                    {
                        if (e.statusCode != HttpStatusCode.BadRequest || e.cause?.code !== 'ENOTDIR')
                            throw e;
                    }
                }

            // Process all dependency types
            const depTypes = skipDevDeps ?
                ["dependencies", "optionalDependencies"] as const :
                [
                    "dependencies",
                    "devDependencies",
                    "peerDependencies",
                    "optionalDependencies",
                    "testDependencies"
                ] as const;

            // Process all dependencies in parallel
            const depPromises: Promise<void>[] = [];

            for (const depType of depTypes)
            {
                const deps = currentPkg[depType] as packagejson.Dependency;
                if (!deps)
                    continue;

                lock.packages[key][depType] = {};

                for (const [depName, version] of Object.entries(deps))
                {
                    depPromises.push((async () =>
                    {
                        signal?.throwIfAborted();

                        let depUrl = URL.canParse(version) ? new URL(version) : new URL(`npm:${depName}/${version}`);
                        if (depUrl.protocol === 'workspace:')
                        {
                            depUrl = new URL(`${depUrl.protocol}${depName}/${depUrl.pathname}`)

                        }

                        // Log dependency walk
                        state.logger.debug('walking ' + depUrl + ' for ' + key);

                        await events?.walkDep?.(depName, version, depUrl, currentPkg);

                        try
                        {
                            const resolvedPkg = await handler.process(depUrl, state);

                            // Add to parent's dependency array


                            if (resolvedPkg)
                            {
                                const depKey = pkgKey(resolvedPkg);
                                lock.packages[key][depType][depUrl.toString()] = depKey;
                                // Now recursively process this dependency
                                await processPackage(resolvedPkg, visited, true);
                            } else
                            {
                                // If we don't have package info (like for URL dependencies), at least add an entry
                                if (!(depUrl.toString() in lock.packages))
                                {
                                    lock.packages[depUrl.toString()] = {
                                        name: depName,
                                        version: version,
                                        resolution: depUrl.toString()
                                    };
                                }
                            }
                        } catch (error)
                        {
                            state.logger.error(`Failed to resolve dependency ${depName}@${version}: ${error}`);
                            // Still add the dependency to the lock file even if resolution fails
                            const fallbackKey = depUrl.toString();
                            lock.packages[key][depType][depUrl.toString()] = fallbackKey;
                            if (!(fallbackKey in lock.packages))
                            {
                                lock.packages[fallbackKey] = {
                                    name: depName,
                                    version: version,
                                    resolution: fallbackKey
                                };
                            }
                        }
                    })());
                }
            }

            // Wait for all dependencies to be processed
            await Promise.all(depPromises);
        }
    }

    // Start processing from root package
    await processPackage(pkg);
    return lock;
}
