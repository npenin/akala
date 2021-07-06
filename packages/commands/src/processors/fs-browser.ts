

import * as  Metadata from '../metadata/index';
import { CommandProcessor, Processor, StructuredParameters } from '../model/processor';
import { Container } from '../model/container';
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
    processor?: Processor
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
    public async handle(command: FSCommand, param: StructuredParameters): MiddlewarePromise
    {
        return new Error('this is not supported in a browser')
    }

    constructor(container: Container<unknown>, private root: string | null)
    {
        super('fs', container);
        throw new Error('this is not supported in a browser')
    }
}