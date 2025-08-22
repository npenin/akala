import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer } from '@akala/core';
import fsHandler, { type FileSystemProvider, type FileHandle, OpenFlags, type RmDirOptions, type RmOptions, type MakeDirectoryOptions, type FileEntry, type StatOptions, type Stats, CopyFlags, type OpenStreamOptions, type PathLike, type GlobOptionsWithFileTypes, type GlobOptionsWithoutFileTypes, VirtualFileHandle } from '@akala/fs'
import { XMLParser } from 'fast-xml-parser';
import { isMatch } from 'micromatch'

fsHandler.useProtocol('dav', (url) =>
{
    return Promise.resolve(new WebDavFS(new URL(url.toString().replace(/^dav:/, 'http:'))));
})

fsHandler.useProtocol('davs', (url) =>
{
    return Promise.resolve(new WebDavFS(new URL(url.toString().replace(/^davs:/, 'https:'))));
})

type WebDavFileHandle = VirtualFileHandle<WebDavFS>;

export class WebDavFS implements FileSystemProvider<WebDavFileHandle>
{
    constructor(public root: URL) { }
    toImportPath(path: PathLike<never>, options?: { withSideEffects?: boolean; }): string
    {
        return this.resolveUrl(path).toString();
    }
    openReadStream(path: PathLike<WebDavFileHandle>, options?: OpenStreamOptions): ReadableStream
    {
        const url = this.isFileHandle(path) ? path.path : this.resolveUrl(path);
        const chunkSize = options?.highWaterMark || 64 * 1024; // Default to 64 KB chunks

        let position = options?.start || 0;
        const end = options?.end;

        return new ReadableStream({
            async pull(controller)
            {
                const headers: Record<string, string> = {};
                if (end !== undefined)
                {
                    headers['Range'] = `bytes=${position}-${Math.min(position + chunkSize - 1, end)}`;
                } else
                {
                    headers['Range'] = `bytes=${position}-${position + chunkSize - 1}`;
                }

                const response = await fetch(url, {
                    method: 'GET',
                    headers,
                });

                if (!response.ok)
                {
                    controller.error(new ErrorWithStatus(response.status, `Failed to read stream at ${url}: ${response.statusText}`));
                    return;
                }

                const chunk = new Uint8Array(await response.arrayBuffer());
                if (chunk.length === 0)
                {
                    controller.close();
                    return;
                }

                controller.enqueue(chunk);
                position += chunk.length;

                if (end !== undefined && position > end)
                {
                    controller.close();
                }
            },
        });
    }
    openWriteStream(path: PathLike<WebDavFileHandle>, options?: OpenStreamOptions): WritableStream
    {
        throw new Error('Method not implemented.');
    }
    readonly: boolean;

    resolveUrl(path: PathLike): URL
    {
        if (typeof path == 'string')
            path = new URL(path, this.root);

        if (!path.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${path} is not in scope of ${this.root}`);
        return path;
    }

    async access(path: PathLike, mode?: OpenFlags): Promise<void>
    {
        path = this.resolveUrl(path);

        try
        {
            const response = await fetch(path, {
                method: 'PROPFIND',
                headers: {
                    Depth: '0',
                },
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Access check to ${path} failed for ${response.statusText}\n${await response.text()}`);
            }

            if (typeof mode !== 'undefined')
            {
                const allowHeader = response.headers.get('allow');
                if (!allowHeader)
                {
                    throw new ErrorWithStatus(HttpStatusCode.PreconditionFailed, `Access check failed: No Allow header in response for ${path}`);
                }

                const allowedMethods = allowHeader.split(',').map(method => method.trim().toUpperCase());
                if ((mode & 0b11) == OpenFlags.Read && !allowedMethods.includes('GET'))
                {
                    throw new ErrorWithStatus(HttpStatusCode.Forbidden, `Read access denied for ${path}`);
                }
                if ((mode & 0b11) && !allowedMethods.includes('PUT'))
                {
                    throw new ErrorWithStatus(HttpStatusCode.Forbidden, `Write access denied for ${path}`);
                }
            }
        } catch (error)
        {
            console.error(`Error checking access for ${path}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }

    async copyFile(src: PathLike, dest: PathLike, mode?: CopyFlags): Promise<void>
    {
        const sourceUrl = this.resolveUrl(src);
        const destinationUrl = this.resolveUrl(dest);

        try
        {
            const response = await fetch(sourceUrl.toString(), {
                method: 'COPY',
                headers: {
                    Destination: destinationUrl.toString(),
                    Overwrite: mode && (mode & CopyFlags.NonExisting) ? 'T' : 'F', // Overwrite if mode includes write
                },
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Copy failed from ${sourceUrl} to ${destinationUrl}: ${response.statusText}\n${await response.text()}`);
            }
        } catch (error)
        {
            console.error(`Error copying file from ${sourceUrl} to ${destinationUrl}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }

    async cp(src: PathLike, dest: PathLike, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
    {
        const sourceUrl = this.resolveUrl(src);
        const destinationUrl = this.resolveUrl(dest);

        try
        {
            const response = await fetch(sourceUrl.toString(), {
                method: 'COPY',
                headers: {
                    Destination: destinationUrl.toString(),
                    Overwrite: options?.force ? 'T' : 'F', // Overwrite if force is true
                },
            });

            if (!response.ok)
                throw new ErrorWithStatus(response.status, `Failed to copy from ${sourceUrl} to ${destinationUrl}: ${response.statusText}\n${await response.text()}`);

            if (options?.recursive)
            {
                // Ensure nested directories and files are copied
                const entries = await this.readdir(src, { withFileTypes: true });
                for (const entry of entries)
                {
                    const entrySrc = new URL(entry.name, sourceUrl).toString();
                    const entryDest = new URL(entry.name, destinationUrl).toString();
                    if (entry.isDirectory)
                    {
                        await this.cp(entrySrc, entryDest, options);
                    } else
                    {
                        await this.cp(entrySrc, entryDest, { force: options.force });
                    }
                }
            }
        }
        catch (error)
        {
            console.error(`Error copying from ${sourceUrl} to ${destinationUrl}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }

    async mkdir(path: PathLike, options?: MakeDirectoryOptions): Promise<void>
    {
        const url = this.resolveUrl(path);
        try
        {
            if (options?.recursive)
            {
                // Split the path and create parent directories recursively
                const parts = url.pathname.substring(this.root.pathname.length).split('/').filter(Boolean);
                let currentPath = new URL(this.root);

                for (const part of parts)
                {
                    currentPath.pathname += `/${part}`;
                    const response = await fetch(currentPath.toString(), {
                        method: 'MKCOL',
                    });

                    if (response.status === 405)
                        // Directory already exists, continue
                        continue;

                    if (!response.ok)
                        throw new ErrorWithStatus(response.status, `Failed to create directory at ${currentPath}: ${response.statusText}\n${await response.text()}`);
                }
            }
            else
            {
                // Create a single directory
                const response = await fetch(url, {
                    method: 'MKCOL',
                });

                if (!response.ok)
                    throw new ErrorWithStatus(response.status, `Failed to create directory at ${url}: ${response.statusText}\n${await response.text()}`);
            }
        }
        catch (error)
        {
            console.error(`Error creating directory at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }

    async symlink(source: PathLike, target: PathLike, type?: 'dir' | 'file' | 'junction'): Promise<void>
    {
        const sourceUrl = this.resolveUrl(source);
        const targetUrl = this.resolveUrl(target);

        try
        {
            const body = `
            <d:propertyupdate xmlns:d="DAV:">
                <d:set>
                    <d:prop>
                        <d:linktarget>${targetUrl.toString()}</d:linktarget>
                        <d:linktype>${type || 'file'}</d:linktype>
                    </d:prop>
                </d:set>
            </d:propertyupdate>
        `;

            const response = await fetch(sourceUrl.toString(), {
                method: 'PROPPATCH',
                headers: {
                    'Content-Type': 'application/xml',
                },
                body,
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to create symbolic link from ${sourceUrl} to ${targetUrl}: ${response.statusText}\n${await response.text()}`);
            }
        } catch (error)
        {
            console.error(`Error creating symbolic link from ${sourceUrl} to ${targetUrl}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    async open(path: PathLike, flags: OpenFlags): Promise<WebDavFileHandle>
    {
        return new VirtualFileHandle(this, this.resolveUrl(path));
    }

    async opendir(path: PathLike, options?: { bufferSize?: number; encoding?: BufferEncoding; }): Promise<FileEntry[]>
    {
        return this.readdir(path, { ...options, withFileTypes: true });
    }
    readdir(path: PathLike, options?: { encoding?: Exclude<BufferEncoding, 'binary'> | null; withFileTypes?: false; }): Promise<string[]>;
    readdir(path: PathLike, options: { encoding: "binary"; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    readdir(path: PathLike, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    async readdir(path: PathLike, options?: { withFileTypes?: boolean, encoding?: BufferEncoding | null }): Promise<any[]>
    {
        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url, {
                method: 'PROPFIND',
                headers: {
                    Depth: '1', // Depth 1 to list immediate children
                },
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to read directory at ${url}: ${response.statusText}\n${await response.text()}`);
            }

            const text = await response.text();
            const parser = new XMLParser();
            const xmlData = parser.parse(text);

            const responses = xmlData['D:multistatus']?.['D:response'];
            if (!responses)
            {
                return [];
            }

            const entries = Array.isArray(responses) ? responses : [responses];
            const result = entries.map((entry: any) =>
            {
                const href = entry['D:href'];
                const name = decodeURIComponent(href.substring(href.lastIndexOf('/') + 1));
                const isDirectory = !!entry['D:propstat']?.['D:prop']?.['D:resourcetype']?.['D:collection'];

                if (options?.withFileTypes)
                {
                    return {
                        name,
                        isFile: !isDirectory,
                        isDirectory,
                    };
                }

                return name;
            });

            return result;
        }
        catch (error)
        {
            console.error(`Error reading directory at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    readFile(path: PathLike<WebDavFileHandle>, options?: { encoding?: null | 'binary', flag?: OpenFlags }): Promise<IsomorphicBuffer>;
    readFile(path: PathLike<WebDavFileHandle>, options: { encoding: BufferEncoding, flag?: OpenFlags }): Promise<string>;
    readFile<T>(path: PathLike<WebDavFileHandle>, options: { encoding: 'json', flag?: OpenFlags }): Promise<T>;
    async readFile(path: PathLike<WebDavFileHandle>, options?: { encoding?: null | BufferEncoding | 'json', flag?: OpenFlags }): Promise<any>
    {
        if (this.isFileHandle(path))
            return path.readFile(options?.encoding);

        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url, {
                method: 'GET',
            });

            if (!response.ok)
                throw new ErrorWithStatus(response.status, `Failed to read file at ${url}: ${response.statusText}\n${await response.text()}`);

            switch (options?.encoding)
            {
                case 'json':
                    return await response.json();
                case 'binary':
                case null:
                    return new Uint8Array(await response.arrayBuffer());
                default:
                    return await response.text();
            }
        }
        catch (error)
        {
            console.error(`Error reading file at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);

        }
    }
    async rename(oldPath: PathLike<WebDavFileHandle>, newPath: PathLike): Promise<void>
    {
        const sourceUrl = this.isFileHandle(oldPath) ? oldPath.path : this.resolveUrl(oldPath);
        const destinationUrl = this.resolveUrl(newPath);

        try
        {
            const response = await fetch(sourceUrl.toString(), {
                method: 'MOVE',
                headers: {
                    Destination: destinationUrl.toString(),
                    Overwrite: 'F', // Always overwrite the destination
                },
            });

            if (!response.ok)
                throw new ErrorWithStatus(response.status, `Failed to rename/move from ${sourceUrl} to ${destinationUrl}: ${response.statusText}\n${await response.text()}`);

            if (this.isFileHandle(oldPath))
            {
                oldPath.path = destinationUrl;
            }
        }
        catch (error)
        {
            console.error(`Error renaming/moving from ${sourceUrl} to ${destinationUrl}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    async rmdir(path: PathLike, options?: RmDirOptions): Promise<void>
    {
        const url = this.resolveUrl(path);

        if (options?.recursive)
        {
            // Perform recursive deletion by first listing and deleting all children
            const entries = await this.readdir(path, { withFileTypes: true });

            for (const entry of entries)
            {
                const entryPath = new URL(entry.name, url);
                if (entry.isDirectory)
                {
                    await this.rmdir(entryPath, { recursive: true });
                } else
                {
                    await this.rm(entryPath);
                }
            }
        }

        const response = await fetch(url, {
            method: 'DELETE',
        });

        if (!response.ok)
            throw new ErrorWithStatus(response.status, `Failed to remove directory at ${url}: ${response.statusText}`);
    }
    async rm(path: PathLike<WebDavFileHandle>, options?: RmOptions): Promise<void>
    {
        const url = this.isFileHandle(path) ? path.path : this.resolveUrl(path);

        if (options?.force)
        {
            try
            {
                const response = await fetch(url, {
                    method: 'DELETE',
                });

                if (!response.ok && response.status !== 404)
                    throw new ErrorWithStatus(response.status, `Failed to remove resource at ${url}: ${response.statusText}`);
            }
            catch (error)
            {
                if (!(error instanceof ErrorWithStatus) || error.statusCode !== 404)
                {
                    throw error;
                }
            }
        }
        else
        {
            const response = await fetch(url, {
                method: 'DELETE',
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to remove resource at ${url}: ${response.statusText}`);
            }
        }
    }
    async stat(path: PathLike<WebDavFileHandle>, opts?: StatOptions & { bigint?: false }): Promise<Stats>;
    async stat(path: PathLike<WebDavFileHandle>, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    async stat(path: PathLike<WebDavFileHandle>, opts?: StatOptions): Promise<Stats<number> | Stats<bigint>>
    async stat(path: PathLike<WebDavFileHandle>, opts?: StatOptions): Promise<Stats<number> | Stats<bigint>>
    {
        const url = this.isFileHandle(path) ? path.path : this.resolveUrl(path);

        try
        {
            const response = await fetch(url, {
                method: 'PROPFIND',
                headers: {
                    Depth: '0',
                },
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to retrieve stats for ${url}: ${response.statusText}\n${await response.text()}`);
            }

            const text = await response.text();
            const parser = new XMLParser();
            const xmlData = parser.parse(text);

            const resourceType = xmlData['D:multistatus']?.['D:response']?.['D:propstat']?.['D:prop']?.['D:resourcetype']?.['D:collection'];
            const contentLength = xmlData['D:multistatus']?.['D:response']?.['D:propstat']?.['D:prop']?.['D:getcontentlength'];
            const lastModified = xmlData['D:multistatus']?.['D:response']?.['D:propstat']?.['D:prop']?.['D:getlastmodified'];
            const creationDate = xmlData['D:multistatus']?.['D:response']?.['D:propstat']?.['D:prop']?.['D:creationdate'];

            return {
                isFile: !resourceType,
                isDirectory: !!resourceType,
                size: contentLength ? opts?.bigint ? BigInt(contentLength) : parseInt(contentLength, 10) : 0,
                mtime: lastModified ? new Date(lastModified) : undefined,
                atime: new Date(),
                ctime: lastModified ? new Date(lastModified) : undefined,
                birthtime: creationDate ? new Date(creationDate) : undefined,
            } as Stats<number>;

        }
        catch (error)
        {
            console.error(`Error retrieving stats for ${url}:`, error);
            throw error;
        }
    }

    async truncate(path: PathLike, len?: number): Promise<void>
    {
        const url = this.resolveUrl(path);

        try
        {
            let truncatedContent: string | Uint8Array | ArrayBuffer;
            if (!len)
            {
                // Read the current file content
                const response = await fetch(url, {
                    method: 'GET',
                });

                if (!response.ok)
                    throw new ErrorWithStatus(response.status, `Failed to read file for truncation at ${url}: ${response.statusText}\n${await response.text()}`);

                const content = await response.arrayBuffer();

                // Truncate the content
                truncatedContent = content.slice(0, len);
            }
            else
                truncatedContent = new ArrayBuffer(0);

            // Write the truncated content back to the file
            const writeResponse = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: truncatedContent,
            });

            if (!writeResponse.ok)
                throw new ErrorWithStatus(writeResponse.status, `Failed to write truncated file at ${url}: ${writeResponse.statusText}\n${await writeResponse.text()}`);
        }
        catch (error)
        {
            console.error(`Error truncating file at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    async unlink(path: PathLike): Promise<void>
    {
        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url, {
                method: 'DELETE',
            });

            if (!response.ok)
                throw new ErrorWithStatus(response.status, `Failed to delete resource at ${url}: ${response.statusText}\n${await response.text()}`);
        } catch (error)
        {
            console.error(`Error deleting resource at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }

    async utimes(path: PathLike, atime: string | number | Date, mtime: string | number | Date): Promise<void>
    {
        {
            const url = this.resolveUrl(path);

            try
            {
                const atimeISO = new Date(atime).toISOString();
                const mtimeISO = new Date(mtime).toISOString();

                const body = `
            <d:propertyupdate xmlns:d="DAV:">
                <d:set>
                    <d:prop>
                        <d:lastaccessed>${atimeISO}</d:lastaccessed>
                        <d:getlastmodified>${mtimeISO}</d:getlastmodified>
                    </d:prop>
                </d:set>
            </d:propertyupdate>
        `;

                const response = await fetch(url, {
                    method: 'PROPPATCH',
                    headers: {
                        'Content-Type': 'application/xml',
                    },
                    body,
                });

                if (!response.ok)
                    throw new ErrorWithStatus(response.status, `Failed to update timestamps for ${url}: ${response.statusText}\n${await response.text()}`);
            }
            catch (error)
            {
                console.error(`Error updating timestamps for ${url}:`, error);
                throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
            }
        }
    }
    watch(filename: PathLike, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'WebDAV does not support watching.');
    }
    async writeFile(path: PathLike<FileHandle>, data: string | IsomorphicBuffer | ArrayBuffer): Promise<void>
    {
        const url = this.resolveUrl(path as PathLike);

        try
        {
            const body = typeof data === 'string' ? data : (data instanceof IsomorphicBuffer ? data.toArray() : new Uint8Array(data)).buffer;

            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': typeof data === 'string' ? `text/plain; charset=utf-8` : 'application/octet-stream',
                },
                body: body,
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to write file at ${url}: ${response.statusText}\n${await response.text()}`);
            }
        } catch (error)
        {
            console.error(`Error writing file at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    chroot(root: PathLike): void
    {
        this.root = this.resolveUrl(root);
    }

    newChroot(root: PathLike): FileSystemProvider<WebDavFileHandle>
    {
        const newRoot = this.resolveUrl(root);
        return new WebDavFS(newRoot);
    }

    isFileHandle(x: any): x is WebDavFileHandle
    {
        return x instanceof VirtualFileHandle;
    }

    public glob(pattern: string | string[], options: GlobOptionsWithFileTypes): AsyncIterable<FileEntry>
    public glob(pattern: string | string[], options?: GlobOptionsWithoutFileTypes): AsyncIterable<URL>
    public glob(pattern: string | string[], options?: GlobOptionsWithFileTypes | GlobOptionsWithoutFileTypes): AsyncIterable<URL> | AsyncIterable<FileEntry>
    {
        try
        {
            return (async function* ()
            {
                const response = await fetch(this.root, {
                    method: 'PROPFIND',
                    headers: {
                        Depth: 'infinity', // Retrieve all nested directories and files
                    },
                });

                if (!response.ok)
                {
                    throw new ErrorWithStatus(response.status, `Failed to retrieve directory structure at ${this.root}: ${response.statusText}\n${await response.text()}`);
                }

                const text = await response.text();
                const parser = new XMLParser();
                const xmlData = parser.parse(text);

                const responses = xmlData['D:multistatus']?.['D:response'];
                if (!responses)
                {
                    return;
                }

                const entries = Array.isArray(responses) ? responses : [responses];
                for (const entry of entries)
                {
                    const href = entry['D:href'];
                    const entryUrl = new URL(href, this.root);

                    if (isMatch(href, pattern))
                    {
                        if (options.withFileTypes)
                        {
                            const exclude = options?.exclude as GlobOptionsWithFileTypes['exclude'];
                            const parent = new URL('./', entryUrl);
                            const name = decodeURIComponent(entryUrl.pathname.substring(parent.pathname.length));

                            const fileEntry: FileEntry = {
                                name,
                                parentPath: new URL('./', entryUrl),
                                get isFile() { return !fileEntry.isBlockDevice && !fileEntry.isCharacterDevice && !fileEntry.isDirectory && !fileEntry.isFIFO && !fileEntry.isSocket && !fileEntry.isSymbolicLink },
                                get isDirectory() { return !!entry['D:propstat']?.['D:prop']?.['D:resourcetype']?.['D:collection'] },
                                get isBlockDevice() { return false; },
                                get isCharacterDevice() { return false; },
                                get isSymbolicLink() { return false; },
                                get isFIFO() { return false; },
                                get isSocket() { return false; }
                            };
                            if (exclude)
                                if (typeof exclude === 'function')
                                {
                                    if (!exclude(fileEntry))
                                        yield fileEntry;
                                }
                                else if (!exclude.find(x => typeof x === 'string' ? isMatch(href, x) : isMatch(href, x.toString())))
                                    yield fileEntry;
                        }

                        if (options?.exclude)
                        {
                            const exclude = options.exclude as GlobOptionsWithoutFileTypes['exclude'];
                            if (typeof exclude === 'function')
                            {
                                if (!exclude(entryUrl))
                                    yield entryUrl;
                            }
                            else if (!exclude.find(x => typeof x === 'string' ? isMatch(href, x) : isMatch(href, x.toString())))
                                yield entryUrl;
                        }
                        else
                            yield entryUrl;
                    }
                }
            })() as AsyncIterable<FileEntry> | AsyncIterable<URL>;
        }
        catch (error)
        {
            console.error(`Error retrieving directory structure at ${this.root}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
}
