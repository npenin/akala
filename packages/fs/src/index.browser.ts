import { IsomorphicBuffer, UrlHandler } from '@akala/core';
import { FileEntry, FileHandle, FileSystemProvider, GlobOptionsWithFileTypes, GlobOptionsWithoutFileTypes, MakeDirectoryOptions, OpenFlags, RmDirOptions, RmOptions, StatOptions, Stats } from './shared.js';

export * from './shared.js';

const fsHandler = new UrlHandler<[URL, void], FileSystemProvider<FileHandle>>(true);
export default fsHandler;
export class FileSystemProviderProxy implements FileSystemProvider
{
    constructor(protected readonly inner: FileSystemProvider)
    {
        this.root = inner.root;
    }

    get readonly(): boolean { return this.inner.readonly }
    root: URL;
    access(path: string | URL, mode?: OpenFlags): Promise<void>
    {
        return this.inner.access(path, mode);
    }
    copyFile(src: string | URL, dest: string | URL, mode?: number): Promise<void>
    {
        return this.inner.copyFile(src, dest, mode);
    }
    cp(src: string | URL, dest: string | URL, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
    {
        return this.inner.cp(src, dest, options);
    }
    mkdir(path: string | URL, options?: MakeDirectoryOptions): Promise<void>
    {
        return this.inner.mkdir(path, options);
    }
    symlink(source: string | URL, target: string | URL, type?: 'dir' | 'file' | 'junction'): Promise<void>
    {
        return this.inner.symlink(source, target, type);
    }
    open(path: string | URL, flags: OpenFlags): Promise<FileHandle>
    {
        return this.inner.open(path, flags);
    }
    opendir(path: string | URL, options?: { bufferSize?: number; encoding?: string; }): Promise<any>
    {
        return this.inner.opendir(path, options);
    }
    readdir(path: string | URL, options?: { encoding?: BufferEncoding | null; withFileTypes?: false; }): Promise<string[]>;
    readdir(path: string | URL, options: { encoding: 'buffer'; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    readdir(path: string | URL, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    readdir(path: unknown, options?: unknown): Promise<string[]> | Promise<IsomorphicBuffer[]> | Promise<import("./shared.js").FileEntry<string>[]>
    {
        // @ts-ignore
        return this.inner.readdir(path as any, options as any);
    }
    readFile(path: string | URL | FileHandle, options?: { encoding?: null | 'binary'; flag?: OpenFlags; }): Promise<IsomorphicBuffer>;
    readFile(path: string | URL | FileHandle, options: { encoding: BufferEncoding; flag?: OpenFlags; }): Promise<string>;
    readFile<T>(path: string | URL | FileHandle, options: { encoding: 'json'; flag?: OpenFlags; }): Promise<T>;
    readFile<T>(path: unknown, options?: unknown): Promise<string> | Promise<IsomorphicBuffer> | Promise<T>
    {
        return this.inner.readFile(path as any, options as any);
    }
    rename(oldPath: string | URL, newPath: string | URL): Promise<void>
    {
        return this.inner.rename(oldPath, newPath);
    }
    rmdir(path: string | URL, options?: RmDirOptions): Promise<void>
    {
        return this.inner.rmdir(path, options);
    }
    rm(path: string | URL, options?: RmOptions): Promise<void>
    {
        return this.inner.rm(path, options);
    }
    stat(path: string | URL, opts?: StatOptions & { bigint?: false; }): Promise<Stats>;
    stat(path: string | URL, opts: StatOptions & { bigint: true; }): Promise<Stats<bigint>>;
    stat(path: unknown, opts?: unknown): Promise<Stats<number>> | Promise<Stats<bigint>>
    {
        return this.inner.stat(path as any, opts as any);
    }
    truncate(path: string | URL, len?: number): Promise<void>
    {
        return this.inner.truncate(path, len);
    }
    unlink(path: string | URL): Promise<void>
    {
        return this.inner.unlink(path);
    }
    utimes(path: string | URL, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        return this.inner.utimes(path, atime, mtime);
    }
    watch(filename: string | URL, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        return this.inner.watch(filename, options);
    }
    writeFile(path: string | URL | FileHandle, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>
    {
        return this.inner.writeFile(path, data);
    }
    chroot(root: string | URL): void
    {
        return this.inner.chroot(root);
    }
    newChroot(root: string | URL): FileSystemProvider<FileHandle>
    {
        return this.inner.newChroot(root);
    }
    isFileHandle(x: any): x is FileHandle
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
