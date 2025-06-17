import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer } from "@akala/core";
import { FileEntry, FileHandle, FileSystemProvider, MakeDirectoryOptions, OpenFlags, OpenStreamOptions, RmDirOptions, RmOptions, StatOptions, Stats } from "./shared.js";
import { Dirent, promises as fs, OpenDirOptions } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { basename, dirname } from "path";
import { Readable, Writable } from "stream";

type PathLike = string | URL;

type FullFileHandle = FileHandle & Omit<fs.FileHandle, 'readFile'>;
type ReadableFileHandle = FullFileHandle;
type WritableFileHandle = FullFileHandle;

function fsFileHandleAdapter(handle: fs.FileHandle, fs: FSFileSystemProvider, path: URL, readonly: boolean): FullFileHandle
{
    return Object.assign({}, handle as Omit<fs.FileHandle, 'readFile'>, {
        path,
        openReadStream(options: OpenStreamOptions): ReadableStream
        {
            return Readable.toWeb(handle.createReadStream(options)) as any;
        },
        openWriteStream(options: OpenStreamOptions): WritableStream
        {
            if (readonly)
                throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');

            return Writable.toWeb(handle.createWriteStream(options)) as any;
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

    chroot(root: string | URL): void
    {
        const newRoot = pathToFileURL(this.resolvePath(root, true));
        if (newRoot.toString() == this.root.toString())
            return;
        this.root = newRoot;
    }

    newChroot(root: string | URL)
    {
        const newRoot = pathToFileURL(this.resolvePath(root, true));
        if (newRoot.toString() == this.root.toString())
            return;
        return new FSFileSystemProvider(newRoot, this.readonly);
    }

    public resolvePath(pathLike: PathLike, unsafe?: boolean): string
    {
        const url = new URL(pathLike, this.root);
        if (!unsafe && !url.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${pathLike} is not in scope of ${this.root}`)
        return fileURLToPath(url) + url.hash;
    }

    async access(path: PathLike, mode?: number): Promise<void>
    {
        return fs.access(this.resolvePath(path), mode);
    }

    async copyFile(src: PathLike, dest: PathLike, mode?: number): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.copyFile(this.resolvePath(src), this.resolvePath(dest), mode);
    }

    async cp(src: PathLike, dest: PathLike, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
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

    async readdir(path: string | URL, options?: { encoding?: BufferEncoding | null; withFileTypes?: false; }): Promise<string[]>;
    async readdir(path: string | URL, options: { encoding: "buffer"; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    async readdir(path: string | URL, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    async readdir(path: string | URL, options?: { encoding?: 'buffer' | BufferEncoding | null; withFileTypes?: boolean }): Promise<string[] | IsomorphicBuffer[] | FileEntry[]>
    {
        return fs.readdir(this.resolvePath(path), options as any).then(files =>
        {
            if (options?.withFileTypes)
            {
                return (files as unknown as Dirent[]).map(f => ({
                    get isFile() { return f.isFile() },
                    get isDirectory() { return f.isDirectory() },
                    get isBlockDevice() { return f.isBlockDevice() },
                    get isCharacterDevice() { return f.isCharacterDevice() },
                    get isSymbolicLink() { return f.isSymbolicLink() },
                    get isFIFO() { return f.isFIFO() },
                    get isSocket() { return f.isSocket() },
                    name: f.name,
                    parentPath: new URL(path),
                }));
            }
            if (options.encoding == 'buffer')
                return files.map(f => IsomorphicBuffer.fromBuffer(f as unknown as Buffer));
            return files;
        });
    }

    async readFile<TEncoding extends BufferEncoding>(path: PathLike | ReadableFileHandle, options: { encoding: TEncoding; flag?: OpenFlags; }): Promise<string>;
    async readFile(path: PathLike | ReadableFileHandle, options?: { flag?: OpenFlags; }): Promise<IsomorphicBuffer>;
    async readFile<T = unknown>(path: PathLike | ReadableFileHandle, options: { encoding: 'json'; flag?: OpenFlags; }): Promise<T>;
    async readFile<T = unknown>(path: PathLike | ReadableFileHandle, options?: any): Promise<string | IsomorphicBuffer | T>
    {
        if (this.isFileHandle(path))
        {
            return path.readFile(options?.encoding);
        }

        if (options?.encoding === 'json')
            return this.readFile(path, { ...options, encoding: 'utf8' }).then(c => JSON.parse(c));

        return fs.readFile(this.resolvePath(path), options).then(content => Buffer.isBuffer(content) ? IsomorphicBuffer.fromBuffer(content) : content, e =>
        {
            if (e.code === 'ENOENT')
                throw new ErrorWithStatus(HttpStatusCode.NotFound, e.message, null, e);
            if (e.code == 'ENOTDIR')
                throw new ErrorWithStatus(HttpStatusCode.BadRequest, e.message, null, e);
            throw e;
        });
    }

    async rename(oldPath: PathLike, newPath: PathLike): Promise<void>
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

    async rm(path: PathLike, options?: RmOptions): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.rm(this.resolvePath(path), options);
    }

    async stat(path: PathLike, opts?: StatOptions & { bigint?: false; }): Promise<Stats>;
    async stat(path: PathLike, opts: StatOptions & { bigint: true; }): Promise<Stats<bigint>>;
    async stat(path: PathLike, opts?: StatOptions): Promise<Stats | Stats<bigint>>
    {
        try
        {
            const stats = await fs.stat(this.resolvePath(path), opts);
            if (opts?.bigint)
            {
                return {
                    parentPath: path instanceof URL ? new URL('.', path) : dirname(path),
                    name: path instanceof URL ? basename(path.pathname) : basename(path),
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
                parentPath: path instanceof URL ? new URL('.', path) : dirname(path),
                name: path instanceof URL ? basename(path.pathname) : basename(path),
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

    async symlink(source: PathLike, target: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>
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

    async truncate(path: PathLike, len?: number): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.truncate(this.resolvePath(path), len);
    }

    async unlink(path: PathLike): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.unlink(this.resolvePath(path));
    }

    async utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return fs.utimes(this.resolvePath(path), atime, mtime);
    }

    async watch(filename: PathLike, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        return fs.watch(this.resolvePath(filename), options);
    }

    async writeFile(path: PathLike | WritableFileHandle, data: string | ArrayBuffer | SharedArrayBuffer | Buffer | Uint8Array): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data as ArrayBuffer);

        if (this.isFileHandle(path))
            return path.writeFile(buffer);

        return fs.writeFile(this.resolvePath(path), buffer);
    }

    public isFileHandle(p: unknown): p is FullFileHandle
    {
        return typeof p === 'object' && p !== null && 'fd' in p;
    }

    public glob(pattern: string | string[])
    {
        return fs.glob(pattern);
    }
}
