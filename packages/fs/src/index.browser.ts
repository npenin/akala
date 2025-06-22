import { IsomorphicBuffer, UrlHandler } from '@akala/core';
import { FileEntry, FileHandle, FileSystemProvider, GlobOptionsWithFileTypes, GlobOptionsWithoutFileTypes, MakeDirectoryOptions, OpenFlags, OpenStreamOptions, PathLike, RmDirOptions, RmOptions, StatOptions, Stats } from './shared.js';

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
