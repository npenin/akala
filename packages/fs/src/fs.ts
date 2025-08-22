import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer } from "@akala/core";
import { CopyFlags, OpenFlags, } from "./shared.js";
import type { FileEntry, FileHandle, FileSystemProvider, GlobOptions, GlobOptionsWithFileTypes, GlobOptionsWithoutFileTypes, MakeDirectoryOptions, OpenStreamOptions, PathLike, RmDirOptions, RmOptions, StatOptions, Stats } from "./shared.js";
import { Dirent, promises as fs, type OpenDirOptions, type GlobOptions as FsGlobOptions, createReadStream, createWriteStream } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { basename, dirname } from "path";
import { Readable, Writable } from "stream";

type FullFileHandle = FileHandle & Omit<fs.FileHandle, 'readFile'>;

type FsPathLike = PathLike<FullFileHandle>

function direntToFileEntry<T extends string | IsomorphicBuffer = string | IsomorphicBuffer>(f: Dirent<T extends IsomorphicBuffer ? Buffer : T>, root: URL): FileEntry<T>
{
    return {
        get isFile() { return f.isFile() },
        get isDirectory() { return f.isDirectory() },
        get isBlockDevice() { return f.isBlockDevice() },
        get isCharacterDevice() { return f.isCharacterDevice() },
        get isSymbolicLink() { return f.isSymbolicLink() },
        get isFIFO() { return f.isFIFO() },
        get isSocket() { return f.isSocket() },
        name: (Buffer.isBuffer(f.name) ? new IsomorphicBuffer(f.name as Buffer<ArrayBuffer>) : f.name) as T,
        parentPath: new URL(root),
    }
}

function fsFileHandleAdapter(handle: fs.FileHandle, fs: FSFileSystemProvider, path: URL, readonly: boolean): FullFileHandle
{
    return Object.assign({}, handle as Omit<fs.FileHandle, 'readFile'>, {
        path,
        openReadStream(options: OpenStreamOptions): ReadableStream
        {
            return Readable.toWeb(handle.createReadStream(options)) as ReadableStream;
        },
        openWriteStream(options: OpenStreamOptions): WritableStream
        {
            if (readonly)
                throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');

            return Writable.toWeb(handle.createWriteStream(options));
        },
        async writeFile(data: string | IsomorphicBuffer)
        {
            if (readonly)
                throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');

            let buffer = typeof data == 'string' ? Buffer.from(data) : data.toArray();
            await handle.truncate(buffer.length)
            await handle.write(buffer, 0, buffer.length, 0);

        },
        async readFile<T = unknown>(encoding?: BufferEncoding | 'json'): Promise<IsomorphicBuffer | string | T>
        {
            if (encoding == 'binary' || !encoding)
                return IsomorphicBuffer.fromBuffer(await handle.readFile({ encoding: null }));
            if (encoding === 'json')
                return await handle.readFile('utf-8').then(JSON.parse) as T;
            return await handle.readFile({ encoding }) as string;
        }
    }) as FullFileHandle;
}

export class FSFileSystemProvider implements FileSystemProvider<FullFileHandle>
{
    constructor(public root: URL, public readonly readonly: boolean)
    {
    }

    toImportPath(path: PathLike<never>): string
    {
        return this.resolvePath(path);
    }

    openReadStream(path: PathLike<FullFileHandle>, options?: OpenStreamOptions): ReadableStream
    {
        if (this.isFileHandle(path))
            return path.openReadStream(options);
        return Readable.toWeb(createReadStream(this.resolvePath(path), options)) as ReadableStream;
    }

    openWriteStream(path: PathLike<FullFileHandle>, options?: OpenStreamOptions): WritableStream
    {
        if (this.isFileHandle(path))
            return path.openWriteStream(options);
        return Writable.toWeb(createWriteStream(this.resolvePath(path), options));

    }

    chroot(root: PathLike): void
    {
        const newRoot = pathToFileURL(this.resolvePath(root, true));
        if (newRoot.toString() == this.root.toString())
            return;
        this.root = newRoot;
    }

    newChroot(root: PathLike)
    {
        const newRoot = pathToFileURL(this.resolvePath(root, true));
        if (newRoot.toString() == this.root.toString())
            return this;
        return new FSFileSystemProvider(newRoot, this.readonly);
    }

    public resolvePath(pathLike: FsPathLike, unsafe?: boolean): string
    {
        if (this.isFileHandle(pathLike))
            return fileURLToPath(pathLike.path) + pathLike.path.hash;
        const url = new URL(pathLike, this.root);
        if (!unsafe && !url.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${pathLike} is not in scope of ${this.root}`)
        return fileURLToPath(url) + url.hash;
    }

    async access(path: FsPathLike, mode?: number): Promise<void>
    {
        return fs.access(this.resolvePath(path), mode);
    }

    async copyFile(src: FsPathLike, dest: PathLike, mode?: CopyFlags): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');

        const fsMode = mode & OpenFlags.NonExisting | mode & 0xFF;

        return fs.copyFile(this.resolvePath(src), this.resolvePath(dest), fsMode);
    }

    async cp(src: FsPathLike, dest: PathLike, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.cp(this.resolvePath(src), this.resolvePath(dest), options);
    }

    async mkdir(path: PathLike, options?: MakeDirectoryOptions & { recursive: true; }): Promise<string | undefined>;
    async mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void>;
    async mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void | string | undefined>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.mkdir(this.resolvePath(path), options);
    }

    async open(path: PathLike, flags: OpenFlags): Promise<FullFileHandle>
    {
        if (this.readonly && (flags & (OpenFlags.Write | OpenFlags.ReadWrite)) > 0)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        try
        {
            return fsFileHandleAdapter(await fs.open(this.resolvePath(path), flags), this, new URL(path, this.root), this.readonly);
        }
        catch (e)
        {
            if (e.code == 'ENOENT')
                throw new ErrorWithStatus(404, e.message, undefined, e);
            throw e;
        }
    }

    async opendir(path: PathLike, options?: OpenDirOptions): Promise<any>
    {
        return fs.opendir(this.resolvePath(path), options);
    }

    async readdir(path: PathLike, options?: { encoding?: Exclude<BufferEncoding, 'binary'> | null; withFileTypes?: false; }): Promise<string[]>;
    async readdir(path: PathLike, options: { encoding: "binary"; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    async readdir(path: PathLike, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    async readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: boolean }): Promise<string[] | IsomorphicBuffer[] | FileEntry[]>
    {
        return fs.readdir(this.resolvePath(path), options as any).then(files =>
        {
            if (options?.withFileTypes)
            {
                return (files as unknown as Dirent[]).map(f => direntToFileEntry(f, new URL(path, this.root)));
            }
            if (options.encoding == 'binary')
                return files.map(f => IsomorphicBuffer.fromBuffer(f as unknown as Buffer<ArrayBuffer>));
            return files;
        });
    }

    async readFile<TEncoding extends BufferEncoding>(path: FsPathLike, options: { encoding: TEncoding; flag?: OpenFlags; }): Promise<string>;
    async readFile(path: FsPathLike, options?: { flag?: OpenFlags; }): Promise<IsomorphicBuffer>;
    async readFile<T = unknown>(path: FsPathLike, options: { encoding: 'json'; flag?: OpenFlags; }): Promise<T>;
    async readFile<T = unknown>(path: FsPathLike, options?: any): Promise<string | IsomorphicBuffer | T>
    {
        if (this.isFileHandle(path))
            return path.readFile(options?.encoding);

        if (options?.encoding === 'json')
            return this.readFile(path, { ...options, encoding: 'utf8' }).then(c => c && JSON.parse(c) || undefined);

        return fs.readFile(this.resolvePath(path), options).then(content => Buffer.isBuffer(content) ? IsomorphicBuffer.fromBuffer(content) : content, e =>
        {
            if (e.code === 'ENOENT')
                throw new ErrorWithStatus(HttpStatusCode.NotFound, e.message, null, e);
            if (e.code == 'ENOTDIR')
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, e.message, null, e);
            throw e;
        });
    }

    async rename(oldPath: FsPathLike, newPath: PathLike): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.rename(this.resolvePath(oldPath), this.resolvePath(newPath));
    }

    async rmdir(path: PathLike, options?: RmDirOptions): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.rmdir(this.resolvePath(path), options);
    }

    async rm(path: FsPathLike, options?: RmOptions): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.rm(this.resolvePath(path), options);
    }

    async stat(path: FsPathLike, opts?: StatOptions & { bigint?: false; }): Promise<Stats>;
    async stat(path: FsPathLike, opts: StatOptions & { bigint: true; }): Promise<Stats<bigint>>;
    async stat(path: FsPathLike, opts?: StatOptions): Promise<Stats | Stats<bigint>>
    {
        try
        {
            const stats = await fs.stat(this.resolvePath(path), opts);
            if (opts?.bigint)
            {
                return {
                    parentPath: path instanceof URL ? new URL('.', path) : typeof path === 'string' ? dirname(path) : new URL('./', path.path),
                    name: path instanceof URL ? basename(path.pathname) : typeof path === 'string' ? basename(path) : basename(path.path.pathname),
                    isFile: stats.isFile(),
                    isDirectory: stats.isDirectory(),
                    size: stats.size as bigint,
                    atimeMs: stats.atimeMs as bigint,
                    mtimeMs: stats.mtimeMs as bigint,
                    ctimeMs: stats.ctimeMs as bigint,
                    birthtimeMs: stats.birthtimeMs as bigint,
                    atime: stats.atime,
                    mtime: stats.mtime,
                    ctime: stats.ctime,
                    birthtime: stats.birthtime
                } as Stats<bigint>;
            }
            return {
                parentPath: path instanceof URL ? new URL('.', path) : typeof path === 'string' ? dirname(path) : new URL('./', path.path),
                name: path instanceof URL ? basename(path.pathname) : typeof path === 'string' ? basename(path) : basename(path.path.pathname),
                isFile: stats.isFile(),
                isDirectory: stats.isDirectory(),
                size: Number(stats.size),
                atimeMs: Number(stats.atimeMs),
                mtimeMs: Number(stats.mtimeMs),
                ctimeMs: Number(stats.ctimeMs),
                birthtimeMs: Number(stats.birthtimeMs),
                atime: stats.atime,
                mtime: stats.mtime,
                ctime: stats.ctime,
                birthtime: stats.birthtime
            } as Stats;
        }
        catch (e)
        {
            if (e.code === 'ENOENT')
                throw new ErrorWithStatus(HttpStatusCode.NotFound, path.toString());
            throw e;
        }
    }

    async symlink(source: FsPathLike, target: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>
    {
        source = this.resolvePath(source);
        target = this.resolvePath(target);
        if (source.endsWith('/'))
            source = source.substring(0, source.length - 1);
        if (target.endsWith('/'))
            target = target.substring(0, target.length - 1);
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        try
        {
            await fs.symlink(target, source, type);
        }
        catch (e)
        {
            if (e.code == 'ENOENT')
                throw new ErrorWithStatus(HttpStatusCode.NotFound, e.message, undefined, e);
            if (e.code == 'EEXIST')
                throw new ErrorWithStatus(HttpStatusCode.Conflict, `The symlink ${source} already exists`, undefined, e);
            if (e.code == 'EPERM' || e.code == 'EACCES')
                throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The symlink ${source} cannot be created`, undefined, e);
            if (e.code == 'EINVAL')
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, `The symlink ${source} is invalid`, undefined, e);
            if (e.code == 'ENOTDIR')
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, `The symlink ${source} is not a directory`, undefined, e);
            if (e.code == 'ENOSPC')
                throw new ErrorWithStatus(HttpStatusCode.InsufficientStorage, `The symlink ${source} cannot be created due to insufficient storage`, undefined, e);
            throw e;
        }

    }

    async truncate(path: FsPathLike, len?: number): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.truncate(this.resolvePath(path), len);
    }

    async unlink(path: FsPathLike): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.unlink(this.resolvePath(path));
    }

    async utimes(path: FsPathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.utimes(this.resolvePath(path), atime, mtime);
    }

    async watch(filename: FsPathLike, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        return fs.watch(this.resolvePath(filename), options);
    }

    async writeFile(path: FsPathLike, data: string | IsomorphicBuffer | ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        const buffer = data instanceof IsomorphicBuffer ? data.toArray() : Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

        if (this.isFileHandle(path))
            return path.writeFile(buffer);

        return fs.writeFile(this.resolvePath(path), buffer);
    }

    public isFileHandle(p: unknown): p is FullFileHandle
    {
        return typeof p === 'object' && p !== null && 'fd' in p;
    }

    public glob(pattern: string | string[], options: GlobOptionsWithFileTypes): AsyncIterable<FileEntry>
    public glob(pattern: string | string[], options?: GlobOptionsWithoutFileTypes): AsyncIterable<URL>
    public glob(pattern: string | string[], options?: GlobOptionsWithFileTypes | GlobOptionsWithoutFileTypes): AsyncIterable<URL> | AsyncIterable<FileEntry>
    {
        const fsOptions: FsGlobOptions = {};

        fsOptions.cwd = options?.cwd || this.resolvePath(this.root);
        fsOptions.withFileTypes = options?.withFileTypes;
        const exclude = options?.exclude as GlobOptions['exclude'];
        switch (typeof exclude)
        {
            case 'function':
                fsOptions.exclude = entry =>
                {
                    if (typeof entry == 'string')
                        return exclude(new URL(entry, this.root));
                    else
                        return exclude(direntToFileEntry(entry, new URL(entry.parentPath, this.root)));
                }
                break;
            case 'object':
                fsOptions.exclude = exclude?.map(e => this.resolvePath(e, true));
        }

        if (options.withFileTypes)
            return (async function* ()
            {
                for await (const entry of fs.glob(pattern, fsOptions))
                {
                    yield direntToFileEntry(entry as Dirent, new URL((entry as Dirent).parentPath, this.root))
                }
            })();
        else
            return (async function* ()
            {
                for await (const entry of fs.glob(pattern, fsOptions))
                {
                    yield new URL((entry as Dirent).parentPath, this.root);
                }
            })()
    }
}
