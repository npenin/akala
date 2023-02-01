import * as  Metadata from '../metadata/index.js';
import { CommandProcessor, StructuredParameters } from '../model/processor.js';
import { Container } from '../model/container.js';
import { MiddlewarePromise } from '@akala/core';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };


export interface DiscoveryOptions
{
    recursive?: boolean
    processor?: CommandProcessor
    isDirectory?: boolean
    ignoreFileWithNoDefaultExport?: boolean
    relativeTo?: string;
}
export class FileSystem extends CommandProcessor
{
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public static async discoverCommands<T>(root: string, container: Container<unknown>, options?: DiscoveryOptions): Promise<void>
    {
        throw new Error('this is not supported in a browser')
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async handle(origin: Container<unknown>, command: FSCommand, param: StructuredParameters): MiddlewarePromise
    {
        return new Error('this is not supported in a browser')
    }

    constructor(private root: string | null)
    {
        super('fs');
        throw new Error('this is not supported in a browser')
    }
}