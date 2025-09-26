import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer, UrlHandler } from '@akala/core';
import { OpenFlags, ReadonlyFileSystemProvider, VirtualFileHandle } from './shared.js';
import type { FileEntry, FileHandle, FileSystemProvider, GlobOptions, GlobOptionsWithFileTypes, GlobOptionsWithoutFileTypes, MakeDirectoryOptions, OpenStreamOptions, PathLike, RmDirOptions, RmOptions, StatOptions, Stats } from './shared.js';

export * from './shared.js';

const fsHandler = new UrlHandler<[URL, void], FileSystemProvider<FileHandle>>(true);
export default fsHandler;

export function hasAccess(fs: FileSystemProvider, path: PathLike, mode?: OpenFlags)
{
    return fs.access(path, mode).then(() => true, () => false);
}

export class FileSystemProviderProxy<TFileHandle extends FileHandle> implements FileSystemProvider<TFileHandle>
{
    constructor(protected readonly inner: FileSystemProvider<TFileHandle>)
    {
        this.root = inner.root;
    }

    toImportPath(path: PathLike<never>, options?: { withSideEffects?: boolean; }): string
    {
        return this.inner.toImportPath(this.resolvePath(path), options);
    }

    openReadStream(path: PathLike<TFileHandle>, options?: OpenStreamOptions): ReadableStream
    {
        return this.inner.openReadStream(this.resolvePath(path), options);
    }

    openWriteStream(path: PathLike<TFileHandle>, options?: OpenStreamOptions): WritableStream
    {
        return this.inner.openWriteStream(this.resolvePath(path), options);
    }

    get readonly(): boolean { return this.inner.readonly }
    root: URL;

    resolvePath<T extends TFileHandle>(path: PathLike<T>): PathLike<T>
    {
        if (this.isFileHandle(path))
            return path;

        path = new URL(path, this.root);

        return new URL(path.toString().substring(this.root.toString().length), this.inner.root);
    }

    access(path: PathLike<TFileHandle>, mode?: OpenFlags): Promise<void>
    {
        return this.inner.access(this.resolvePath(path), mode);
    }
    copyFile(src: PathLike<TFileHandle>, dest: PathLike, mode?: number): Promise<void>
    {
        return this.inner.copyFile(this.resolvePath(src), this.resolvePath(dest), mode);
    }
    cp(src: PathLike<TFileHandle>, dest: PathLike, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
    {
        return this.inner.cp(this.resolvePath(src), this.resolvePath(dest), options);
    }
    mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void>
    {
        return this.inner.mkdir(this.resolvePath(path), options);
    }
    symlink(source: PathLike<TFileHandle>, target: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>
    {
        return this.inner.symlink(this.resolvePath(source), this.resolvePath(target), type);
    }

    open(path: PathLike, flags: OpenFlags): Promise<TFileHandle>
    {
        return this.inner.open(this.resolvePath(path), flags);
    }

    opendir(path: PathLike, options?: { bufferSize?: number; encoding?: string; }): Promise<any>
    {
        return this.inner.opendir(this.resolvePath(path), options);
    }

    readdir(path: PathLike, options?: { encoding?: Exclude<BufferEncoding, 'binary'> | null; withFileTypes?: false; }): Promise<string[]>
    readdir(path: PathLike, options: { encoding: 'binary'; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>
    readdir(path: PathLike, options: { withFileTypes: true; }): Promise<FileEntry[]>
    readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: boolean; }): Promise<string[] | IsomorphicBuffer[] | FileEntry[]>
    {
        return this.inner.readdir(this.resolvePath(path), options);
    }
    readFile(path: PathLike<TFileHandle>, options?: { encoding?: null | 'binary', flag?: OpenFlags }): Promise<IsomorphicBuffer>
    readFile(path: PathLike<TFileHandle>, options: { encoding: BufferEncoding, flag?: OpenFlags }): Promise<string>
    readFile<T>(path: PathLike<TFileHandle>, options: { encoding: 'json', flag?: OpenFlags }): Promise<T>
    readFile<T>(path: PathLike<TFileHandle>, options?: { encoding?: BufferEncoding | 'json', flag?: OpenFlags }): Promise<string> | Promise<IsomorphicBuffer> | Promise<T>
    {
        return this.inner.readFile(this.resolvePath(path), options as any);
    }
    rename(oldPath: PathLike<TFileHandle>, newPath: PathLike): Promise<void>
    {
        return this.inner.rename(this.resolvePath(oldPath), this.resolvePath(newPath));
    }
    rmdir(path: PathLike, options?: RmDirOptions): Promise<void>
    {
        return this.inner.rmdir(this.resolvePath(path), options);
    }
    rm(path: PathLike, options?: RmOptions): Promise<void>
    {
        return this.inner.rm(this.resolvePath(path), options);
    }
    stat(path: PathLike<TFileHandle>, opts?: StatOptions & { bigint?: false }): Promise<Stats>
    stat(path: PathLike<TFileHandle>, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>
    stat(path: PathLike<TFileHandle>, opts: StatOptions): Promise<Stats<bigint> | Stats>
    {
        return this.inner.stat(this.resolvePath(path), opts);
    }
    truncate(path: PathLike<TFileHandle>, len?: number): Promise<void>
    {
        return this.inner.truncate(this.resolvePath(path), len);
    }
    unlink(path: PathLike<TFileHandle>): Promise<void>
    {
        return this.inner.unlink(this.resolvePath(path));
    }
    utimes(path: PathLike<TFileHandle>, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        return this.inner.utimes(this.resolvePath(path), atime, mtime);
    }
    watch(filename: PathLike<TFileHandle>, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        return this.inner.watch(this.resolvePath(filename), options);
    }
    writeFile(path: PathLike<TFileHandle>, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>
    {
        return this.inner.writeFile(this.resolvePath(path), data);
    }
    chroot(root: PathLike): void
    {
        return this.inner.chroot(this.resolvePath(root));
    }
    newChroot(root: PathLike): FileSystemProvider<TFileHandle>
    {
        return this.inner.newChroot(this.resolvePath(root));
    }
    isFileHandle(x: any): x is TFileHandle
    {
        return this.inner.isFileHandle(x);
    }
    public glob(pattern: string | string[], options: GlobOptionsWithFileTypes): AsyncIterable<FileEntry>
    public glob(pattern: string | string[], options?: GlobOptionsWithoutFileTypes): AsyncIterable<URL>
    public glob(pattern: string | string[], options?: GlobOptionsWithFileTypes | GlobOptionsWithoutFileTypes)
    {
        return this.inner.glob(pattern, options);
    }
}

export async function openFile(filePath: string | URL, flags: OpenFlags)
{
    if (typeof filePath == 'string')
        if (URL.canParse(filePath))
            filePath = new URL(filePath);
        else
            filePath = new URL(filePath, window.location.href);

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

fsHandler.useProtocol('https', url =>
{
    return Promise.resolve(new (class FetchFs extends ReadonlyFileSystemProvider implements FileSystemProvider<FileHandle>
    {
        constructor(public root: URL)
        {
            super(root);
        }

        private resolvePath(path: PathLike<FileHandle>): URL
        {
            if (this.isFileHandle(path))
                path = path.path;
            const fullUrl = new URL(path, this.root);
            if (!fullUrl.href.startsWith(this.root.href))
                throw new Error('Access denied: path outside root');
            return fullUrl;
        }
        toImportPath(path: PathLike<never>, options?: { withSideEffects?: boolean; }): string
        {
            return this.resolvePath(path).href;
        }
        openReadStream(path: PathLike<FileHandle>, options?: OpenStreamOptions | OpenStreamOptions['encoding']): ReadableStream
        {
            // const fullUrl = this.resolvePath(path);
            // Since the interface is synchronous, we need to create a wrapper stream.
            // However, this may not be ideal as it can't be synchronous.
            // For simplicity, throw error.
            throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'openReadStream is asynchronous for HTTPS; use readFile or open instead.');
        }

        access(path: PathLike<FileHandle>, mode?: OpenFlags): Promise<void>
        {
            if (mode && (mode & OpenFlags.Write || mode & OpenFlags.ReadWrite))
            {
                throw new Error('File system is read-only');
            }
            const fullUrl = this.resolvePath(path);
            return fetch(fullUrl, { method: 'HEAD' }).then(res =>
            {
                if (!res.ok) throw new ErrorWithStatus(res.status, res.statusText);
            });
        }

        open(path: PathLike, flags: OpenFlags): Promise<FileHandle>
        {
            const fullUrl = this.resolvePath(path);
            return Promise.resolve(new VirtualFileHandle(this, fullUrl));
        }
        opendir(path: PathLike, options?: { bufferSize?: number; encoding?: string; }): Promise<any>
        {
            throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Method not implemented.');
        }
        readdir(path: PathLike, options?: { encoding?: Exclude<BufferEncoding, 'binary'> | null; withFileTypes?: false; }): Promise<string[]>;
        readdir(path: PathLike, options: { encoding: 'binary'; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
        readdir(path: PathLike, options: { withFileTypes: true; }): Promise<FileEntry[]>;
        readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: boolean; }): Promise<string[] | IsomorphicBuffer[] | FileEntry[]>;
        readdir(path: unknown, options?: unknown): Promise<string[]> | Promise<IsomorphicBuffer[]> | Promise<FileEntry<string>[]> | Promise<string[] | IsomorphicBuffer[] | FileEntry<string>[]>
        {
            throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Method not implemented.');
        }
        readFile(path: PathLike<FileHandle>, options?: { encoding?: null | 'binary'; flag?: OpenFlags; } | 'binary'): Promise<IsomorphicBuffer>;
        readFile(path: PathLike<FileHandle>, options: { encoding: BufferEncoding; flag?: OpenFlags; } | BufferEncoding): Promise<string>;
        readFile<T>(path: PathLike<FileHandle>, options: { encoding: 'json'; flag?: OpenFlags; } | 'json'): Promise<T>;
        async readFile<T>(path: PathLike<FileHandle>, options?: { encoding?: BufferEncoding | 'json'; flag?: OpenFlags; } | 'json' | BufferEncoding): Promise<IsomorphicBuffer | string | T>
        {
            const fullUrl = this.resolvePath(path);
            const encoding = typeof options === 'object' ? options ? options.encoding : undefined : options;
            const res = await fetch(fullUrl);

            if (!res.ok)
                throw new ErrorWithStatus(res.status, res.headers.get('content-length') == '0' ? res.statusText : await res.text());

            if (encoding === 'binary' || !encoding || encoding === null)
                return IsomorphicBuffer.fromArrayBuffer(await res.arrayBuffer());

            if (encoding === 'json')
            {
                return res.json();
            }
            return res.text();
        }

        stat(path: PathLike<FileHandle>, opts?: StatOptions & { bigint?: false; }): Promise<Stats>;
        stat(path: PathLike<FileHandle>, opts: StatOptions & { bigint: true; }): Promise<Stats<bigint>>;
        stat(path: PathLike<FileHandle>, opts: StatOptions): Promise<Stats<bigint> | Stats>;
        async stat(path: PathLike<FileHandle>, opts?: StatOptions & { bigint?: boolean; }): Promise<Stats<number> | Stats<bigint>>
        {
            const fullUrl = this.resolvePath(path);
            const res = await fetch(fullUrl, { method: 'HEAD' });
            if (!res.ok)
                throw new ErrorWithStatus(res.status, res.headers.get('content-length') == '0' ? res.statusText : await res.text());
            const lastModified = res.headers.get('last-modified');
            const mtime = lastModified ? new Date(lastModified) : new Date();
            const contentLength = res.headers.get('content-length');
            const size = contentLength ? parseInt(contentLength, 10) : 0;
            const parentPath = new URL(fullUrl.pathname.substring(0, fullUrl.pathname.lastIndexOf('/') + 1), fullUrl);
            const name = fullUrl.pathname.split('/').pop() || '';
            if (opts?.bigint)
            {
                return {
                    name,
                    parentPath,
                    get isFile() { return true; },
                    get isDirectory() { return false; },
                    get isBlockDevice() { return false; },
                    get isCharacterDevice() { return false; },
                    get isSymbolicLink() { return false; },
                    get isFIFO() { return false; },
                    get isSocket() { return false; },
                    size: BigInt(size),
                    atimeMs: 0n,
                    mtimeMs: BigInt(mtime.getTime()),
                    ctimeMs: 0n,
                    birthtimeMs: 0n,
                    atime: new Date(0),
                    mtime,
                    ctime: new Date(0),
                    birthtime: new Date(0),
                } as Stats<bigint>;
            }
            return {
                name,
                parentPath,
                get isFile() { return true; },
                get isDirectory() { return false; },
                get isBlockDevice() { return false; },
                get isCharacterDevice() { return false; },
                get isSymbolicLink() { return false; },
                get isFIFO() { return false; },
                get isSocket() { return false; },
                size,
                atimeMs: 0,
                mtimeMs: mtime.getTime(),
                ctimeMs: 0,
                birthtimeMs: 0,
                atime: new Date(0),
                mtime,
                ctime: new Date(0),
                birthtime: new Date(0),
            } as Stats;
        }
        watch(filename: PathLike<FileHandle>, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
        {
            throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Method not implemented.');
        }

        chroot(root: PathLike): void
        {
            this.root = new URL(root, this.root);
        }
        newChroot(root: PathLike): FileSystemProvider<FileHandle>
        {
            const newRoot = new URL(root, this.root);
            return new FetchFs(newRoot);
        }
        isFileHandle(x: any): x is FileHandle
        {
            return x instanceof VirtualFileHandle;
        }
        glob(pattern: string | string[], options: GlobOptionsWithFileTypes): AsyncIterable<FileEntry>;
        glob(pattern: string | string[], options?: GlobOptionsWithoutFileTypes): AsyncIterable<URL>;
        glob(pattern: string | string[], options?: GlobOptions): AsyncIterable<URL> | AsyncIterable<FileEntry>;
        glob(pattern: unknown, options?: unknown): AsyncIterable<FileEntry<string>> | AsyncIterable<URL>
        {
            throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'Method not implemented.');
        }

    })(url))
})
