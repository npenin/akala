import { ErrorWithStatus, HttpStatusCode } from "@akala/core";
import { FileSystemProvider, MakeDirectoryOptions, OpenFlags, RmDirOptions, RmOptions, StatOptions, Stats } from "./shared.js";
import { promises as fs, OpenDirOptions } from 'fs';
import { FileHandle as NodeFileHandle } from 'fs/promises';
import { fileURLToPath, pathToFileURL } from 'url';

type PathLike = string | URL;



export class FSFileSystemProvider implements FileSystemProvider<fs.FileHandle>
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

    public resolvePath(pathLike: PathLike, unsafe?: boolean): string
    {
        const url = new URL(pathLike, this.root);
        if (!unsafe && !url.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${pathLike} is not in scope of ${this.root}`)
        return fileURLToPath(url);
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

    async open(path: PathLike, flags: OpenFlags): Promise<fs.FileHandle>
    {
        if (this.readonly && flags != 'r')
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        return await fs.open(this.resolvePath(path), flags);
    }

    async opendir(path: PathLike, options?: OpenDirOptions): Promise<any>
    {
        return fs.opendir(this.resolvePath(path), options);
    }

    async readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: false; }): Promise<string[]>;
    async readdir(path: PathLike, options: { encoding: "buffer"; withFileTypes?: false; }): Promise<Buffer[]>;
    async readdir(path: PathLike, options: { withFileTypes: true; }): Promise<any[]>;
    async readdir(path: PathLike, options?: any): Promise<string[] | Buffer[] | any[]>
    {
        return fs.readdir(this.resolvePath(path), options);
    }

    async readFile(path: PathLike | NodeFileHandle, options?: { encoding?: null; flag?: string; }): Promise<Buffer>;
    async readFile(path: PathLike | NodeFileHandle, options: { encoding: BufferEncoding; flag?: string; }): Promise<string>;
    async readFile(path: PathLike | NodeFileHandle, options?: any): Promise<string | Buffer>
    {
        if (this.isFileHandle(path))
        {
            return fs.readFile(path, options);
        }
        return fs.readFile(this.resolvePath(path), options).catch(e =>
        {
            if (e.code === 'ENOENT')
                throw new ErrorWithStatus(HttpStatusCode.NotFound, e.message);
            throw e;
        }
        );
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
        const stats = await fs.stat(this.resolvePath(path), opts);
        if (opts?.bigint)
        {
            return {
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

    async writeFile(path: PathLike | fs.FileHandle, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>
    {
        if (this.readonly)
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, 'The file system is readonly');
        const buffer = Buffer.from(data as ArrayBuffer);

        if (this.isFileHandle(path))
            return fs.writeFile(path, buffer);

        return fs.writeFile(this.resolvePath(path), buffer);
    }

    public isFileHandle(p: unknown): p is fs.FileHandle
    {
        return typeof p === 'object' && p !== null && 'fd' in p;
    }
}
