import { IsomorphicBuffer } from "@akala/core";

export interface FileHandle
{
    readonly path: URL;
    openReadStream(options?: OpenStreamOptions): ReadableStream;
    openWriteStream(options?: OpenStreamOptions): WritableStream;
    readFile(encoding: Exclude<BufferEncoding, 'binary'>): Promise<string>;
    readFile(encoding: 'binary'): Promise<IsomorphicBuffer>;
    readFile<T>(encoding: 'json'): Promise<T>;
    writeFile(data: string | IsomorphicBuffer): Promise<void>;
    close(): Promise<void>;
    [Symbol.dispose](): void;
    [Symbol.asyncDispose](): Promise<void>;
    stat(opts?: StatOptions & { bigint: false }): Promise<Stats>;
    stat(opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    stat(opts?: StatOptions): Promise<Stats | Stats<bigint>>;
}


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
     * @since v10.10.0
     */
    get isFile(): boolean;
    /**
     * Returns `true` if the `FileEntry` object describes a file system
     * directory.
     * @since v10.10.0
     */
    get isDirectory(): boolean;
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
     * Checks the accessibility of a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param mode - The access mode (optional).
     * @returns A promise that resolves if the file or directory is accessible.
     */
    access(path: string | URL, mode?: OpenFlags): Promise<void>;

    /**
     * Copies a file from the source path to the destination path.
     * 
     * @param src - The source file path.
     * @param dest - The destination file path.
     * @param mode - The copy mode (optional).
     * @returns A promise that resolves when the file is copied.
     */
    copyFile(src: string | URL, dest: string | URL, mode?: number): Promise<void>;

    /**
     * Copies files or directories recursively.
     * 
     * @param src - The source path.
     * @param dest - The destination path.
     * @param options - Options for the copy operation (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    cp(src: string | URL, dest: string | URL, options?: { force?: boolean; recursive?: boolean }): Promise<void>;

    /**
     * Creates a directory at the specified path.
     * 
     * @param path - The path to create the directory.
     * @param options - Options for directory creation.
     * @returns A promise that resolves with the path of the created directory if recursive, otherwise void.
     */
    mkdir(path: string | URL, options?: MakeDirectoryOptions): Promise<void>;

    /**
     * Creates a symbolic link.
     *
     * @return Fulfills with `undefined` upon success.
     */
    symlink(source: string | URL, target: string | URL, type?: 'dir' | 'file' | 'junction'): Promise<void>;

    /**
     * Opens a file at the specified path.
     * 
     * @param path - The path to the file.
     * @param flags - The flags for opening the file.
     * @returns A promise that resolves with the file handle.
     */
    open(path: string | URL, flags: OpenFlags): Promise<TFileHandle>;

    /**
     * Opens a directory for reading.
     * 
     * @param path - The path to the directory.
     * @param options - Options for opening the directory (optional).
     * @returns A promise that resolves with the directory handle.
     */
    opendir(path: string | URL, options?: { bufferSize?: number, encoding?: string }): Promise<any>;

    /**
     * Reads the contents of a directory.
     * 
     * @param path - The path to the directory.
     * @param options - Options for reading the directory.
     * @returns A promise that resolves with the directory contents.
     */
    readdir(path: string | URL, options?: { encoding?: BufferEncoding | null; withFileTypes?: false; }): Promise<string[]>;
    readdir(path: string | URL, options: { encoding: "buffer"; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    readdir(path: string | URL, options: { withFileTypes: true; }): Promise<FileEntry[]>;

    /**
     * Reads the contents of a file.
     * 
     * @param path - The path or handle to the file.
     * @param options - Options for reading the file.
     * @returns A promise that resolves with the file contents.
     */
    readFile(path: string | URL | TFileHandle, options?: { encoding?: null | 'binary', flag?: OpenFlags }): Promise<IsomorphicBuffer>;
    readFile(path: string | URL | TFileHandle, options: { encoding: BufferEncoding, flag?: OpenFlags }): Promise<string>;
    readFile<T>(path: string | URL | TFileHandle, options: { encoding: 'json', flag?: OpenFlags }): Promise<T>;

    /**
     * Renames a file or directory.
     * 
     * @param oldPath - The current path of the file or directory.
     * @param newPath - The new path of the file or directory.
     * @returns A promise that resolves when the operation is complete.
     */
    rename(oldPath: string | URL, newPath: string | URL): Promise<void>;

    /**
     * Removes a directory.
     * 
     * @param path - The path to the directory.
     * @param options - Options for removing the directory (optional).
     * @returns A promise that resolves when the directory is removed.
     */
    rmdir(path: string | URL, options?: RmDirOptions): Promise<void>;

    /**
     * Removes a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param options - Options for the removal operation (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    rm(path: string | URL, options?: RmOptions): Promise<void>;

    /**
     * Retrieves the stats of a file or directory.
     * 
     * @param path - The path to the file or directory.
     * @param opts - Options for retrieving stats.
     * @returns A promise that resolves with the stats object.
     */
    stat(path: string | URL, opts?: StatOptions & { bigint?: false }): Promise<Stats>;
    stat(path: string | URL, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;

    /**
     * Truncates a file to a specified length.
     * 
     * @param path - The path to the file.
     * @param len - The length to truncate to (optional).
     * @returns A promise that resolves when the operation is complete.
     */
    truncate(path: string | URL, len?: number): Promise<void>;

    /**
     * Deletes a file.
     * 
     * @param path - The path to the file.
     * @returns A promise that resolves when the file is deleted.
     */
    unlink(path: string | URL): Promise<void>;

    /**
     * Updates the access and modification times of a file.
     * 
     * @param path - The path to the file.
     * @param atime - The new access time.
     * @param mtime - The new modification time.
     * @returns A promise that resolves when the operation is complete.
     */
    utimes(path: string | URL, atime: string | number | Date, mtime: string | number | Date): Promise<void>;

    /**
     * Watches for changes on a file or directory.
     * 
     * @param filename - The path to the file or directory.
     * @param options - Options for watching (optional).
     * @returns A promise that resolves with the watcher object.
     */
    watch(filename: string | URL, options?: { encoding?: BufferEncoding, recursive?: boolean }): Promise<any>;

    /**
     * Writes data to a file.
     * 
     * @param path - The path or handle to the file.
     * @param data - The data to write.
     * @returns A promise that resolves when the data is written.
     */
    writeFile(path: string | URL | TFileHandle, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>;

    /**
     * Changes the root directory of the file system provider.
     * 
     * @param root - The new root directory.
     */
    chroot(root: string | URL): void;

    /**
     * Creates a new file system provider with the new root directory.
     * 
     * @param root - The new root directory.
     */
    newChroot(root: string | URL): FileSystemProvider<TFileHandle>;

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
    glob(pattern: string | string[]): AsyncIterable<string>
}
