import { UrlHandler } from '@akala/core';

const fsHandler = new UrlHandler<[URL, void], FileSystemProvider<unknown>>(true);
export default fsHandler;

export type OpenFlags = 'r' | 'w' | 'rw' | 'rw+' | 'w+';

export interface MakeDirectoryOptions
{
    recursive?: boolean;
}

export interface StatOptions
{
    bigint?: boolean;
}

export interface Stats<T = number>
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

export interface FileSystemProvider<TFileHandle>
{
    access(path: string | URL, mode?: number): Promise<void>;
    copyFile(src: string | URL, dest: string | URL, mode?: number): Promise<void>;
    cp(src: string | URL, dest: string | URL, options?: { force?: boolean; recursive?: boolean }): Promise<void>;
    mkdir(path: string | URL, options?: MakeDirectoryOptions & { recursive: true }): Promise<string | undefined>;
    mkdir(path: string | URL, options?: MakeDirectoryOptions): Promise<void>;
    open(path: string | URL, flags: OpenFlags | number): Promise<TFileHandle>;
    opendir(path: string | URL, options?: { bufferSize?: number, encoding?: string }): Promise<any>;
    readdir(path: string | URL, options?: { encoding?: BufferEncoding | null, withFileTypes?: false }): Promise<string[]>;
    readdir(path: string | URL, options: { encoding: 'buffer', withFileTypes?: false }): Promise<Buffer[]>;
    readdir(path: string | URL, options: { withFileTypes: true }): Promise<any[]>;
    readFile(path: string | URL | TFileHandle, options?: { encoding?: null, flag?: string }): Promise<Buffer>;
    readFile(path: string | URL | TFileHandle, options: { encoding: BufferEncoding, flag?: string }): Promise<string>;
    rename(oldPath: string | URL, newPath: string | URL): Promise<void>;
    rmdir(path: string | URL, options?: RmDirOptions): Promise<void>;
    rm(path: string | URL, options?: RmOptions): Promise<void>;
    stat(path: string | URL, opts?: StatOptions & { bigint?: false }): Promise<Stats>;
    stat(path: string | URL, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    truncate(path: string | URL, len?: number): Promise<void>;
    unlink(path: string | URL): Promise<void>;
    utimes(path: string | URL, atime: string | number | Date, mtime: string | number | Date): Promise<void>;
    watch(filename: string | URL, options?: { encoding?: BufferEncoding, recursive?: boolean }): Promise<any>;
    writeFile(path: string | URL | TFileHandle, data: string | ArrayBuffer | SharedArrayBuffer): Promise<void>;

    isFileHandle(x: any): x is TFileHandle;
}

