import generateMetadata from './generate-metadata.js';

export default function generate(name?: string, folder?: string, outputFile?: string)
{
    return generateMetadata(name, folder, outputFile || 'commands.d.ts')
}