import { IsomorphicBuffer } from "@akala/core";

export interface FileHandle
{
    readonly path: URL;
    openReadStream(options?: OpenStreamOptions): ReadableStream;
    openWriteStream(options?: OpenStreamOptions): WritableStream;
    readFile(encoding: Exclude<BufferEncoding, 'binary'>): Promise<string>;
    readFile(encoding: 'binary'): Promise<IsomorphicBuffer>;
    readFile<T>(encoding: 'json'): Promise<T>;
    readFile<T>(encoding: 'json' | BufferEncoding): Promise<T | IsomorphicBuffer | string>;
    writeFile(data: string | IsomorphicBuffer): Promise<void>;
    close(): Promise<void>;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
    stat(opts?: StatOptions & { bigint: false }): Promise<Stats>;
    stat(opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    stat(opts?: StatOptions): Promise<Stats | Stats<bigint>>;
}

export class VirtualFileHandle<FSP extends FileSystemProvider> implements FileHandle
{

    constructor(protected readonly fs: FSP, public path: URL) { }

    openReadStream(options?: OpenStreamOptions): ReadableStream
    {
        return this.fs.openReadStream(this.path, options);
    }

    openWriteStream(options?: OpenStreamOptions): WritableStream
    {
        return this.fs.openWriteStream(this.path, options);
    }

    readFile(encoding: Exclude<BufferEncoding, 'binary'>): Promise<string>;
    readFile(encoding: 'binary'): Promise<IsomorphicBuffer>;
    readFile<T>(encoding: 'json'): Promise<T>;
    readFile<T>(encoding: null | BufferEncoding | 'json'): Promise<IsomorphicBuffer | string | T>
    readFile<T>(encoding: null | BufferEncoding | 'json'): Promise<IsomorphicBuffer | string | T>
    {
        return this.fs.readFile(this.path, { encoding } as any) as any;
    }
    writeFile(data: string | IsomorphicBuffer): Promise<void>
    {
        return this.fs.writeFile(this.path, data);
    }
    close(): Promise<void>
    {
        return Promise.resolve();
    }

    stat(opts?: StatOptions & {
        bigint: false;
    }): Promise<Stats>
    stat(opts: StatOptions & {
        bigint: true;
    }): Promise<Stats<bigint>>
    stat(opts?: StatOptions): Promise<Stats | Stats<bigint>>
    stat(opts?: StatOptions)
    {
        return this.fs.stat(this.path, opts);
    }
    [Symbol.dispose](): void
    {
    }
    [Symbol.asyncDispose](): Promise<void>
    {
        return Promise.resolve();
    }
}

export type PathLike<TFileHandle extends FileHandle = never> = string | URL | TFileHandle;

export enum OpenFlags
{
    /** Open file for appending. The file is created if it does not exist. */
    Append = 0o0200,

    /** Open file for reading.An exception occurs if the file does not exist. */
    Read = 0o0000,

    /** Open file for reading and writing.An exception occurs if the file does not exist. */
    ReadWrite = 0o0002,

    /** Open file for writing. The file is created (if it does not exist) or truncated (if it exists). */
    Write = 0o001,

    CreateIfNotExist = 0o0100,

    Truncate = 0o1000,

    NonExisting = 0o0200,
}

export enum CopyFlags
{
    NonExisting = OpenFlags.NonExisting,
}

export interface MakeDirectoryOptions
{
    recursive?: boolean;
}

export interface StatOptions
{
    bigint?: boolean;
}

export interface OpenStreamOptions
{
    encoding?: BufferEncoding,
    autoClose?: boolean | undefined;
    emitClose?: boolean | undefined;
    start?: number | undefined;
    end?: number | undefined;
    highWaterMark?: number | undefined;
}

export interface FileEntry<Name extends string | IsomorphicBuffer = string>
{
    /**
     * Returns `true` if the `FileEntry` object describes a regular file.
     */
    get isFile(): boolean;
    /**
     * Returns `true` if the `FileEntry` object describes a file system
     * directory.
     */
    get isDirectory(): boolean;

    /**
     * Returns `true` if the `fs.Dirent` object describes a block device.
     * @since v10.10.0
     */
    get isBlockDevice(): boolean;
    /**
     * Returns `true` if the `fs.Dirent` object describes a character device.
     * @since v10.10.0
     */
    get isCharacterDevice(): boolean;
    /**
     * Returns `true` if the `fs.Dirent` object describes a symbolic link.
     * @since v10.10.0
     */
    get isSymbolicLink(): boolean;
    /**
     * Returns `true` if the `fs.Dirent` object describes a first-in-first-out
     * (FIFO) pipe.
     * @since v10.10.0
     */
    get isFIFO(): boolean;
    /**
     * Returns `true` if the `fs.Dirent` object describes a socket.
     * @since v10.10.0
     */
    get isSocket(): boolean;

    /**
     * The file name that this `FileEntry` object refers to. The type of this
     * value is determined by the `options.encoding` passed to {@link readdir} or {@link readdirSync}.
     */
    name: Name;
    /**
     * The base path that this `FileEntry` object refers to.
     */
    parentPath: URL;
}

export interface Stats<T = number> extends FileEntry
{
    get isFile(): boolean;
    get isDirectory(): boolean;
    size: T;
    atimeMs: T;
    mtimeMs: T;
    ctimeMs: T;
    birthtimeMs: T;
    atime: Date;
    mtime: Date;
    ctime: Date;
    birthtime: Date;
}

export interface RmOptions extends RmDirOptions
{
    /**
     * When `true`, exceptions will be ignored if `path` does not exist.
     * @default false
     */
    force?: boolean;
}

export interface RmDirOptions
{
    /**
     * If an `EBUSY`, `EMFILE`, `ENFILE`, `ENOTEMPTY`, or
     * `EPERM` error is encountered, Node.js will retry the operation with a linear
     * backoff wait of `retryDelay` ms longer on each try. This option represents the
     * number of retries. This option is ignored if the `recursive` option is not
     * `true`.
     * @default 0
     */
    maxRetries?: number;
    /**
     * @deprecated since v14.14.0 In future versions of Node.js and will trigger a warning
     * `fs.rmdir(path, { recursive: true })` will throw if `path` does not exist or is a file.
     * Use `fs.rm(path, { recursive: true, force: true })` instead.
     *
     * If `true`, perform a recursive directory removal. In
     * recursive mode, operations are retried on failure.
     * @default false
     */
    recursive?: boolean;
    /**
     * The amount of time in milliseconds to wait between retries.
     * This option is ignored if the `recursive` option is not `true`.
     * @default 100
     */
    retryDelay?: number;
}

interface _GlobOptions<T extends FileEntry | URL>
{
    /**
     * Current working directory.
     * @default root
     */
    cwd?: string | undefined;
    /**
     * `true` if the glob should return paths as `FileEntry`s, `false` otherwise.
     * @default false
     * @since v22.2.0
     */
    withFileTypes?: boolean | undefined;
    /**
     * Function to filter out files/directories or a
     * list of glob patterns to be excluded. If a function is provided, return
     * `true` to exclude the item, `false` to include it.
     * @default undefined
     */
    exclude?: ((fileName: T) => boolean) | readonly (PathLike)[] | undefined;
}
export interface GlobOptions extends _GlobOptions<FileEntry | URL> { }
export interface GlobOptionsWithFileTypes extends _GlobOptions<FileEntry>
{
    withFileTypes: true;
}
export interface GlobOptionsWithoutFileTypes extends _GlobOptions<URL>
{
    withFileTypes?: false | undefined;
}

/**
 * Represents an abstract file system provider interface, defining a set of methods and properties
 * for interacting with files and directories in a platform-agnostic way.
 * 
 * @typeParam TFileHandle - The type representing a file handle, defaulting to `FileHandle`.
 * 
 * Implementations of this interface should provide concrete logic for file system operations such as
 * reading, writing, copying, deleting files and directories, as well as handling symbolic links,
 * watching for changes, and managing file system roots.
 * 
 * The interface supports only asynchronous operations, and is designed to be
 * compatible with various environments (e.g., Node.js, browser, virtual file systems).
 * 
 * @remarks
 * - The `readonly` property indicates if the provider supports write operations.
 * - The `root` property specifies the root URL of the file system.
 * - Methods accept both string and URL types for paths, and support a variety of options for flexibility.
 * - The interface supports advanced features such as recursive operations, file handle management,
 *   and glob pattern matching.
 * 
 * @see FileHandle
 * @see Stats
 * @see MakeDirectoryOptions
 * @see RmDirOptions
 * @see RmOptions
 * @see StatOptions
 * @see IsomorphicBuffer
 * @see FileEntry
 */
export interface FileSystemProvider<TFileHandle extends FileHandle = FileHandle>
{
    /**
     * Wether the FileSystemProvider supports alter operations.
     */
    readonly readonly: boolean;

    /**
     * The root URL of the file system.
     */
    readonly root: URL;

    /**
     * Converts a given path to an importable string path, suitable for module imports or references.
     *
     * @param path - The file system path to convert.
     * @param options - Optional settings for the conversion.
     * @param options.withSideEffects - If true, indicates the import path may have side effects.
     * @returns The importable string path.
     */
    toImportPath(path: PathLike<never>, options?: { withSideEffects?: boolean }): string;

    /**
     * Opens a readable stream for reading data from the file system.
     *
     * @param path - The path to the file or directory.
     * @param options - Optional settings for opening the stream.
     * @returns A {@link ReadableStream} for reading file data.
     */
    openReadStream(path: PathLike<TFileHandle>, options?: OpenStreamOptions): ReadableStream;

    /**
     * Opens a writable stream for writing data to the file system.
     *
     * @param path - The path to the file or directory.
     * @param options - Optional settings for opening the stream.
     * @returns A {@link WritableStream} for writing file data.
     */
    openWriteStream(path: PathLike<TFileHandle>, options?: OpenStreamOptions): WritableStream;

    /**
     * Checks the accessibility of a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param mode - The access mode (optional).
     * @returns A promise that resolves if the file or directory is accessible.
     */
    access(path: PathLike<TFileHandle>, mode?: OpenFlags): Promise<void>;

    /**
     * Copies a file from the source path to the destination path.
     * 
     * @param src - The source file path.
     * @param dest - The destination file path.
     * @param mode - The copy mode (optional).
     * @returns A promise that resolves when the file is copied.
     */
    copyFile(src: PathLike<TFileHandle>, dest: string | URL, mode?: number): Promise<void>;

    /**
     * Copies files or directories recursively.
     * 
     * @param src - The source path.
     * @param dest - The destination path.
     * @param options - Options for the copy operation (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    cp(src: PathLike<TFileHandle>, dest: string | URL, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

    /**
     * Creates a directory at the specified path.
     * 
     * @param path - The path to create the directory.
     * @param options - Options for directory creation.
     * @returns A promise that resolves with the path of the created directory if recursive, otherwise void.
     */
    mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void>;

    /**
     * Creates a symbolic link.
     *
     * @return Fulfills with `undefined` upon success.
     */
    symlink(source: PathLike<TFileHandle>, target: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>;

    /**
     * Opens a file at the specified path.
     * 
     * @param path - The path to the file.
     * @param flags - The flags for opening the file.
     * @returns A promise that resolves with the file handle.
     */
    open(path: PathLike, flags: OpenFlags): Promise<TFileHandle>;

    /**
     * Opens a directory for reading.
     * 
     * @param path - The path to the directory.
     * @param options - Options for opening the directory (optional).
     * @returns A promise that resolves with the directory handle.
     */
    opendir(path: PathLike, options?: { bufferSize?: number, encoding?: string }): Promise<any>;

    /**
     * Reads the contents of a directory.
     * 
     * @param path - The path to the directory.
     * @param options - Options for reading the directory.
     * @returns A promise that resolves with the directory contents.
     */
    readdir(path: PathLike, options?: { encoding?: Exclude<BufferEncoding, 'binary'> | null; withFileTypes?: false; }): Promise<string[]>;
    readdir(path: PathLike, options: { encoding: 'binary'; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    readdir(path: PathLike, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    readdir(path: PathLike, options?: { encoding?: BufferEncoding | null; withFileTypes?: boolean; }): Promise<string[] | IsomorphicBuffer[] | FileEntry[]>;

    /**
     * Reads the contents of a file.
     * 
     * @param path - The path or handle to the file.
     * @param options - Options for reading the file.
     * @returns A promise that resolves with the file contents.
     */
    readFile(path: PathLike<TFileHandle>, options?: { encoding?: null | 'binary', flag?: OpenFlags }): Promise<IsomorphicBuffer>;
    readFile(path: PathLike<TFileHandle>, options: { encoding: BufferEncoding, flag?: OpenFlags }): Promise<string>;
    readFile<T>(path: PathLike<TFileHandle>, options: { encoding: 'json', flag?: OpenFlags }): Promise<T>;

    /**
     * Renames a file or directory.
     * 
     * @param oldPath - The current path of the file or directory.
     * @param newPath - The new path of the file or directory.
     * @returns A promise that resolves when the operation is complete.
     */
    rename(oldPath: PathLike<TFileHandle>, newPath: string | URL): Promise<void>;

    /**
     * Removes a directory.
     * 
     * @param path - The path to the directory.
     * @param options - Options for removing the directory (optional).
     * @returns A promise that resolves when the directory is removed.
     */
    rmdir(path: PathLike, options?: RmDirOptions): Promise<void>;

    /**
     * Removes a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param options - Options for the removal operation (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    rm(path: PathLike, options?: RmOptions): Promise<void>;

    /**
     * Retrieves the stats of a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param opts - Options for retrieving stats.
     * @returns A promise that resolves with the stats object.
     */
    stat(path: PathLike<TFileHandle>, opts?: StatOptions & { bigint?: false }): Promise<Stats>;
    stat(path: PathLike<TFileHandle>, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    stat(path: PathLike<TFileHandle>, opts: StatOptions): Promise<Stats<bigint> | Stats>;

    /**
     * Truncates a file to a specified length.
     * 
     * @param path - The path to the file.
     * @param len - The length to truncate to (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    truncate(path: PathLike<TFileHandle>, len?: number): Promise<void>;

    /**
     * Deletes a file.
     * 
     * @param path - The path to the file.
     * @returns A promise that resolves when the file is deleted.
     */
    unlink(path: PathLike<TFileHandle>): Promise<void>;

    /**
     * Updates the access and modification times of a file.
     * 
     * @param path - The path to the file.
     * @param atime - The new access time.
     * @param mtime - The new modification time.
     * @returns A promise that resolves when the operation is complete.
     */
    utimes(path: PathLike<TFileHandle>, atime: string | number | Date, mtime: string | number | Date): Promise<void>;

    /**
     * Watches for changes on a file or directory.
     * 
     * @param filename - The path to the file or directory.
     * @param options - Options for watching (optional).
     * @returns A promise that resolves with the watcher object.
     */
    watch(filename: PathLike<TFileHandle>, options?: { encoding?: BufferEncoding, recursive?: boolean }): Promise<any>;

    /**
     * Writes data to a file.
     * 
     * @param path - The path or handle to the file.
     * @param data - The data to write.
     * @returns A promise that resolves when the data is written.
     */
    writeFile(path: PathLike<TFileHandle>, data: IsomorphicBuffer | string | ArrayBuffer | SharedArrayBuffer, options?: { mode?: number }): Promise<void>;

    /**
     * Changes the root directory of the file system provider.
     * 
     * @param root - The new root directory.
     */
    chroot(root: PathLike): void;

    /**
     * Creates a new file system provider with the new root directory.
     * 
     * @param root - The new root directory.
     */
    newChroot(root: PathLike): FileSystemProvider<TFileHandle>;

    /**
     * Determines if the given object is a file handle.
     * 
     * @param x - The object to check.
     * @returns `true` if the object is a file handle, otherwise `false`.
     */
    isFileHandle(x: any): x is TFileHandle;


    /**
     * Returns an async iterator that yields file paths matching the given glob pattern(s).
     *
     * @param pattern - A glob pattern string or an array of glob patterns to match files against.
     * @returns An async iterator that yields the paths of files matching the specified pattern(s).
     *
     * @example
     * ```typescript
     * for await (const filePath of provider.glob('** /*.ts')) {
        * console.log(filePath);
     * }
     * ```
     */
    glob(pattern: string | string[], options: GlobOptionsWithFileTypes): AsyncIterable<FileEntry>
    glob(pattern: string | string[], options?: GlobOptionsWithoutFileTypes): AsyncIterable<URL>
    glob(pattern: string | string[], options?: GlobOptions): AsyncIterable<URL> | AsyncIterable<FileEntry>
}
