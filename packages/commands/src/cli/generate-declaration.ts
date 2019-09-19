import * as akala from "..";
import * as core from '@akala/core'
import generateMetadata from './generate-metadata';

export default function generate(name: string, folder?: string, outputFile?: string)
{
    return generateMetadata(name, folder, outputFile || 'commands.d.ts')
};