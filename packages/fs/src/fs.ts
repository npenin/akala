import { ErrorWithStatus, HttpStatusCode } from "@akala/core";
import { FileSystemProvider, MakeDirectoryOptions, OpenFlags, RmDirOptions, RmOptions, StatOptions, Stats } from "./index.js";
import { promises as fs, OpenDirOptions } from 'fs';
import { FileHandle as NodeFileHandle } from 'fs/promises';
import { fileURLToPath } from 'url';

type PathLike = string | URL;



export class FSFileSystemProvider implements FileSystemProvider<fs.FileHandle>
{
    constructor(private readonly root: URL)
    {
    }

    private resolvePath(pathLike: PathLike): string
    {
        const url = new URL(pathLike, this.root);
        if (!url.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${pathLike} is not in scope of ${this.root}`)
        return fileURLToPath(url);
    }

    async access(path: PathLike, mode?: number): Promise<void>
    {
        return fs.access(this.resolvePath(path), mode);
    }

    async copyFile(src: PathLike, dest: PathLike, mode?: number): Promise<void>
    {
        return fs.copyFile(this.resolvePath(src), this.resolvePath(dest), mode);
    }

    async cp(src: PathLike, dest: PathLike, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
    {
        return fs.cp(this.resolvePath(src), this.resolvePath(dest), options);
    }

    async mkdir(path: PathLike, options?: MakeDirectoryOptions & { recursive: true; }): Promise<string | undefined>;
    async mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void>;
    async mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void | string | undefined>
    {
        return fs.mkdir(this.resolvePath(path), options);
    }

    async open(path: PathLike, flags: OpenFlags | number): Promise<fs.FileHandle>
    {
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
        const isFileHandle = (p: unknown): p is NodeFileHandle =>
            typeof p === 'object' && p !== null && 'fd' in p;

        if (isFileHandle(path))
        {
            return fs.readFile(path, options);
        }
        return fs.readFile(this.resolvePath(path), options);
    }

    async rename(oldPath: PathLike, newPath: PathLike): Promise<void>
    {
        return fs.rename(this.resolvePath(oldPath), this.resolvePath(newPath));
    }

    async rmdir(path: PathLike, options?: RmDirOptions): Promise<void>
    {
        return fs.rmdir(this.resolvePath(path), options);
    }

    async rm(path: PathLike, options?: RmOptions): Promise<void>
    {
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
        return fs.truncate(this.resolvePath(path), len);
    }

    async unlink(path: PathLike): Promise<void>
    {
        return fs.unlink(this.resolvePath(path));
    }

    async utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        return fs.utimes(this.resolvePath(path), atime, mtime);
    }

    async watch(filename: PathLike, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        return fs.watch(this.resolvePath(filename), options);
    }

    async writeFile(path: PathLike | fs.FileHandle, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>
    {
        const buffer = Buffer.from(data as ArrayBuffer);
        const isFileHandle = (p: unknown): p is fs.FileHandle =>
            typeof p === 'object' && p !== null && 'fd' in p;

        if (isFileHandle(path))
        {
            return fs.writeFile(path, buffer);
        }
        return fs.writeFile(this.resolvePath(path), buffer);
    }

    isFileHandle(p: any): p is fs.FileHandle
    {
        return typeof p === 'object' && p !== null && 'fd' in p;
    }
}
