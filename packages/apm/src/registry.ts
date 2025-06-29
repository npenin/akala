import { delay, ErrorWithStatus, packagejson, UrlHandler } from "@akala/core";
import { closest, State } from "./state.js";
import { glob } from 'fs/promises'
import { join } from "path";

export const handler = new UrlHandler<[URL, State, void], packagejson.CoreProperties>(true);

export const versionParser = /^(?<range>[*^~])?(?<version>(?<major>\d+)(?:\.(?<minor>\d+|x)(?:\.(?<patch>\d+|x))?)?)?$/;

export type VersionRange = '*' | '^' | '~' | ''

export interface ParsedVersion
{ range: VersionRange, version: string, major: number, minor: number, patch: number }

export function parseVersion(version: string): ParsedVersion
{
    const parsedVersion = versionParser.exec(version)?.groups;
    const result: ParsedVersion = { range: '', version: '', major: 0, minor: 0, patch: 0 };
    if (!parsedVersion)
    {
        result.range = '*';
        return result;
    }
    if (parsedVersion.patch == 'x' || parsedVersion.patch === undefined)
    {
        result.patch = 0
        result.version = `${parsedVersion.major}.${parsedVersion.minor}.0`;
        result.range = '~'
    }
    else
        result.patch = Number(parsedVersion.patch);
    if (parsedVersion.minor == 'x' || parsedVersion.minor == undefined)
    {
        result.minor = 0
        result.version = `${parsedVersion.major}.0.0`;
        result.range = '^'
    }
    else
        result.minor = Number(parsedVersion.minor);
    if (!version || !parsedVersion.version)
    {
        result.major = 0
        result.version = '';
        result.range = '*'
    }
    else 
    {
        if (parsedVersion.major)
            result.major = Number(parsedVersion.major);

        if (!result.version && parsedVersion.version)
            result.version = parsedVersion.version
    }

    if (!result.range && parsedVersion.range)
        result.range = parsedVersion.range as VersionRange

    return result as ParsedVersion;
}

namespace npm
{
    export interface Root
    {
        _id: string
        _rev: string
        name: string
        "dist-tags": Record<string, string>
        versions: Versions
        time: Time
        author: string
        license: string
        homepage: string
        repository: Repository
        maintainers: Maintainer[]
        readme: string
        readmeFilename: string
        users: Users
    }

    export type Versions = Record<string, packagejson.CoreProperties>

    export type Time = Record<string, string>
    export interface Repository
    {
        type: string
        url: string
    }
    export type Users = Record<string, boolean>;

    export interface Maintainer
    {
        name: string
        email: string
        [key: string]: string
    }

    export type Scripts = Record<string, string>;

    export interface NpmUser
    {
        name: string
        email: string
    }

    export type Directories = Record<string, string>

    export interface NpmOperationalInternal
    {
        tmp: string
        host: string
    }
}

const retries: Record<string, number> = {};

handler.useProtocol('npm', async (url, state) =>
{
    const fragments = url.pathname.split('/');
    let res: Response;
    const version = parseVersion(fragments[fragments.length - 1]);

    if (version.range || !version.version)
        fragments.pop();

    url = new URL(url.protocol + fragments.join('/'));

    if (fragments.length > 1)
    {
        if (fragments.length == 2 && fragments[0] === '')
            res = await fetch(new URL(url.pathname, state.registry['']), {
                headers: { 'Accept': 'application/vnd.npm.install-v1+json' }
            });
        else if (state.registry[fragments[0]])
            res = await fetch(new URL(url.pathname, state.registry[fragments[0]]), {
                headers: { 'Accept': 'application/vnd.npm.install-v1+json' }
            });
        else
            res = await fetch(new URL(url.pathname, state.registry['']));

    }
    else
        res = await fetch(new URL(url.pathname, state.registry['']), {
            headers: { 'Accept': 'application/vnd.npm.install-v1+json' }
        });

    if (!version.range && res.ok)
        return res.json();

    if (!res.ok)
    {
        switch (res.status)
        {
            case 404:
                if (version.range)
                    throw new ErrorWithStatus(res.status, `Package ${url.pathname} not found: ${await res.text()}`);
                else
                    throw new ErrorWithStatus(res.status, `Version ${version.version} of package ${url.pathname} not found: ${await res.text()}`);
            case 502:
            case 504:
                retries[url.toString()] = (retries[url.toString()] || 0) + 1;
                if (retries[url.toString()] > 3)
                    throw new ErrorWithStatus(res.status, 'Failed to fetch package ' + url.toString() + ' after 3 retries: ' + await res.text());
                return delay(1000).then(() => handler.process(url, state));
            default:
                throw new ErrorWithStatus(res.status, await res.text());
        }
    }
    delete retries[url.toString()];

    const result = await res.json() as npm.Root;
    let prefix: string;
    switch (version.range)
    {
        case '~':
            prefix = [version.major, version.minor].join('.');
            break;
        case '^':
            prefix = [version.major].join('.');
            break;
        case '*':
            prefix = '';
            break;
    }
    const selectedVersion = Object.entries(result.versions).filter(e => e[0].startsWith(prefix)).sort((a, b) =>
    {
        const as = a[0].split('.');
        const bs = b[0].split('.');
        if (as.length == 4 && bs.length == 4)
            return 0;
        if (as.length == 4)
            return 1;
        if (bs.length == 4)
            return -1;
        if (as[0] == bs[0])
        {
            if (as[1] == bs[1])
            {
                if (as[2].includes('-'))
                    return -1;
                if (bs[2].includes('-'))
                    return 1;

                return Number(bs[2]) - Number(as[2]);
            }
            else
                return Number(bs[1]) - Number(as[1]);
        }
        else
            return Number(bs[0]) - Number(as[0]);
    })[0];

    return selectedVersion[1];
});

handler.useHost('github.com', async (url, state) =>
{
    if (url.protocol == 'git+https:' || url.protocol == 'git:')
    {
        let [_, owner, repo] = url.pathname.split('/');
        if (repo.endsWith('.git'))
            repo = repo.substring(0, repo.length - 4);
        url = new URL(`github:${owner}/${repo}` + url.hash);
        return handler.process(url, state);
    }
    const packageUrl = new URL(url.pathname.split('/').slice(1, 3).concat(['refs/heads/' + (url.hash?.substring(1) || 'main') + '/package.json']).join('/'), new URL('https://raw.githubusercontent.com/'));

    const res = await fetch(packageUrl);

    if (!res.ok)
        throw new ErrorWithStatus(res.status, await res.text());

    const pkg: packagejson.CoreProperties = await res.json();

    pkg.dist = { tarball: url.toString() };

    return pkg;
});

handler.useProtocol('github', async (url, state) =>
{
    let packageUrl: URL;
    if (url.hash.length == 8 || url.hash.length == 41)
        packageUrl = new URL(url.pathname + '/' + url.hash.substring(1) + '/package.json', new URL('https://raw.githubusercontent.com/'));
    else
        packageUrl = new URL(url.pathname + '/refs/heads/' + url.hash.substring(1) + '/package.json', new URL('https://raw.githubusercontent.com/'));

    const res = await fetch(packageUrl);

    if (!res.ok)
        throw new ErrorWithStatus(res.status, await res.text());

    const pkg: packagejson.CoreProperties = await res.json();

    pkg.dist = { tarball: new URL('https://github.com/' + url.pathname + '/tarball/' + url.hash.substring(1)).toString() };

    if (url.hash)
        pkg.version += '-' + url.hash.substring(1);

    return pkg;
});

export const workspaceCache: Record<string, { fsPath: string, pkg: packagejson.CoreProperties }> = {};
let workspaceProcessing: Promise<void>;

handler.useProtocol('workspace', async (url, state) =>
{
    if (url.toString() in workspaceCache)
        return workspaceCache[url.toString()].pkg;

    if (workspaceProcessing)
        await workspaceProcessing;
    else
        await (workspaceProcessing = closest(state.fs, 'package.json').then(async res =>
        {
            try
            {
                const pkg = await res.readFile<packagejson.CoreProperties>('json');

                if (pkg.workspaces)
                {
                    for await (const workspace of glob(pkg.workspaces))
                    {
                        try
                        {
                            const wspacePkg = await state.fs.readFile<packagejson.CoreProperties>(join(workspace, 'package.json'), { encoding: 'json' });

                            workspaceCache[`workspace:${wspacePkg.name}`] = { fsPath: workspace, pkg: wspacePkg };
                            wspacePkg.resolution = `workspace:${wspacePkg.name}/${wspacePkg.version}`;
                        }
                        catch (e)
                        {
                            if (e.statusCode == 400 && e.cause?.code == 'ENOTDIR')
                                continue;
                            throw e;
                        }
                    }
                }
            }
            finally
            {
                await res.close();
            }
        }));

    const pkg = Object.entries(workspaceCache).find(e => url.toString().startsWith(e[0] + '/'))
    if (pkg)
        return pkg[1].pkg;

    throw undefined;
});
