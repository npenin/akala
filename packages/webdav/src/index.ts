import { ErrorWithStatus, HttpStatusCode, IsomorphicBuffer } from '@akala/core';
import fsHandler, { FileSystemProvider, FileHandle, OpenFlags, RmDirOptions, RmOptions, MakeDirectoryOptions, FileEntry, StatOptions, Stats, CopyFlags, OpenStreamOptions } from '@akala/fs'
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

export class WebDavFileHandle implements FileHandle
{
    constructor(private fs: WebDavFS, public readonly path: URL) { }

    openReadStream(options?: OpenStreamOptions): ReadableStream
    {
        const url = this.path;
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

                const response = await fetch(url.toString(), {
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

    openWriteStream(options?: OpenStreamOptions): WritableStream
    {
        throw new ErrorWithStatus(HttpStatusCode.NotAcceptable, 'WebDAV streaming is not supported');
    }

    readFile(encoding: Exclude<BufferEncoding, 'binary'>): Promise<string>;
    readFile(encoding: 'binary'): Promise<IsomorphicBuffer>;
    readFile<T>(encoding: 'json'): Promise<T>;
    readFile<T>(encoding: 'binary' | null | BufferEncoding | 'json'): Promise<IsomorphicBuffer> | Promise<string> | Promise<T>
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

export class WebDavFS implements FileSystemProvider<FileHandle>
{
    constructor(public root: URL) { }
    readonly: boolean;

    resolveUrl(path: string | URL): URL
    {
        if (typeof path == 'string')
            path = new URL(path, this.root);

        if (!path.toString().startsWith(this.root.toString()))
            throw new ErrorWithStatus(HttpStatusCode.Forbidden, `The path ${path} is not in scope of ${this.root}`);
        return path;
    }

    async access(path: string | URL, mode?: OpenFlags): Promise<void>
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

    async copyFile(src: string | URL, dest: string | URL, mode?: CopyFlags): Promise<void>
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

    async cp(src: string | URL, dest: string | URL, options?: { force?: boolean; recursive?: boolean; }): Promise<void>
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

    async mkdir(path: string | URL, options?: MakeDirectoryOptions): Promise<void>
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
                const response = await fetch(url.toString(), {
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

    async symlink(source: string | URL, target: string | URL, type?: 'dir' | 'file' | 'junction'): Promise<void>
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
    async open(path: string | URL, flags: OpenFlags): Promise<FileHandle>
    {
        return new WebDavFileHandle(this, this.resolveUrl(path));
    }

    async opendir(path: string | URL, options?: { bufferSize?: number; encoding?: BufferEncoding; }): Promise<FileEntry[]>
    {
        return this.readdir(path, { ...options, withFileTypes: true });
    }
    readdir(path: string | URL, options?: { encoding?: BufferEncoding | null; withFileTypes?: false; }): Promise<string[]>;
    readdir(path: string | URL, options: { encoding: "buffer"; withFileTypes?: false; }): Promise<IsomorphicBuffer[]>;
    readdir(path: string | URL, options: { withFileTypes: true; }): Promise<FileEntry[]>;
    async readdir(path: string | URL, options?: { withFileTypes?: boolean, encoding?: BufferEncoding | null | 'buffer' }): Promise<any[]>
    {
        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url.toString(), {
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
    readFile(path: string | URL | FileHandle, options?: { encoding?: null | 'binary', flag?: OpenFlags }): Promise<IsomorphicBuffer>;
    readFile(path: string | URL | FileHandle, options: { encoding: BufferEncoding, flag?: OpenFlags }): Promise<string>;
    readFile<T>(path: string | URL | FileHandle, options: { encoding: 'json', flag?: OpenFlags }): Promise<T>;
    async readFile(path: string | URL | FileHandle, options?: { encoding?: 'binary' | null | BufferEncoding | 'json', flag?: OpenFlags }): Promise<any>
    {
        const url = this.resolveUrl(path as string | URL);

        try
        {
            const response = await fetch(url.toString(), {
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
    async rename(oldPath: string | URL, newPath: string | URL): Promise<void>
    {
        const sourceUrl = this.resolveUrl(oldPath);
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
        }
        catch (error)
        {
            console.error(`Error renaming/moving from ${sourceUrl} to ${destinationUrl}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
    async rmdir(path: string | URL, options?: RmDirOptions): Promise<void>
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

        const response = await fetch(url.toString(), {
            method: 'DELETE',
        });

        if (!response.ok)
            throw new ErrorWithStatus(response.status, `Failed to remove directory at ${url}: ${response.statusText}`);
    }
    async rm(path: string | URL, options?: RmOptions): Promise<void>
    {
        const url = this.resolveUrl(path);

        if (options?.force)
        {
            try
            {
                const response = await fetch(url.toString(), {
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
            const response = await fetch(url.toString(), {
                method: 'DELETE',
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to remove resource at ${url}: ${response.statusText}`);
            }
        }
    }
    stat(path: string | URL, opts?: StatOptions & { bigint?: false }): Promise<Stats>;
    stat(path: string | URL, opts: StatOptions & { bigint: true }): Promise<Stats<bigint>>;
    stat(path: string | URL, opts?: StatOptions): Promise<Stats<number> | Stats<bigint>>
    async stat(path: string | URL, opts?: StatOptions): Promise<Stats<number> | Stats<bigint>>
    {
        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url.toString(), {
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

    async truncate(path: string | URL, len?: number): Promise<void>
    {
        const url = this.resolveUrl(path);

        try
        {
            let truncatedContent: string | Uint8Array | ArrayBuffer;
            if (!len)
            {
                // Read the current file content
                const response = await fetch(url.toString(), {
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
            const writeResponse = await fetch(url.toString(), {
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
    async unlink(path: string | URL): Promise<void>
    {
        const url = this.resolveUrl(path);

        try
        {
            const response = await fetch(url.toString(), {
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

    async utimes(path: string | URL, atime: string | number | Date, mtime: string | number | Date): Promise<void>
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

                const response = await fetch(url.toString(), {
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
    watch(filename: string | URL, options?: { encoding?: BufferEncoding; recursive?: boolean; }): Promise<any>
    {
        throw new ErrorWithStatus(HttpStatusCode.NotImplemented, 'WebDAV does not support watching.');
    }
    async writeFile(path: string | URL | FileHandle, data: string | IsomorphicBuffer | ArrayBuffer | SharedArrayBuffer): Promise<void>
    {
        const url = this.resolveUrl(path as string | URL);

        try
        {
            const body = typeof data === 'string' ? data : data instanceof IsomorphicBuffer ? data.toArray() : new Uint8Array(data);

            const response = await fetch(url.toString(), {
                method: 'PUT',
                headers: {
                    'Content-Type': typeof data === 'string' ? `text/plain; charset=utf-8` : 'application/octet-stream',
                },
                body,
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
    chroot(root: string | URL): void
    {
        this.root = this.resolveUrl(root);
    }

    newChroot(root: string | URL): FileSystemProvider<FileHandle>
    {
        const newRoot = this.resolveUrl(root);
        return new WebDavFS(newRoot);
    }

    isFileHandle(x: any): x is FileHandle
    {
        return x instanceof WebDavFileHandle;
    }

    async * glob(pattern: string | string[]): AsyncIterable<string>
    {
        const url = this.root;

        try
        {
            const response = await fetch(url.toString(), {
                method: 'PROPFIND',
                headers: {
                    Depth: 'infinity', // Retrieve all nested directories and files
                },
            });

            if (!response.ok)
            {
                throw new ErrorWithStatus(response.status, `Failed to retrieve directory structure at ${url}: ${response.statusText}\n${await response.text()}`);
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
                const entryPath = decodeURIComponent(new URL(href, url).toString());

                if (isMatch(entryPath, pattern))
                    yield entryPath;
            }
        }
        catch (error)
        {
            console.error(`Error retrieving directory structure at ${url}:`, error);
            throw new ErrorWithStatus(HttpStatusCode.InternalServerError, '', undefined, error);
        }
    }
}
