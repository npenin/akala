

import * as path from 'path'
import * as akala from '@akala/core'
import * as  Metadata from '../metadata';
import { CommandProcessor, Processor } from '../model/processor';
import { Container } from '../model/container';
import { CommandProxy } from '../model/command';
import { configure } from '../decorators';
import { HttpClient } from './http-client';
import { proxy } from '../generator';
import { Local } from './local';

export interface FileSystemConfiguration extends Metadata.Configuration
{
    path: string;
    source?: string;
}

export type FSCommand = Metadata.Command & { config?: { fs?: FileSystemConfiguration } };


export class FileSystem<T> extends CommandProcessor<T>
{
    public static async discoverCommands<T>(root: string, container: Container<T>, options?: { recursive?: boolean, processor?: Processor<T>, isDirectory?: boolean }): Promise<void>
    {
        throw new Error('this is not supported in a browser')
    }

    public async process(command: FSCommand, param: { param: any[] })
    {
        throw new Error('this is not supported in a browser')
    }

    constructor(container: Container<T>, private root: string | null)
    {
        super('fs', container);
        throw new Error('this is not supported in a browser')
    }
}