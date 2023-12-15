
declare module 'conventional-changelog-angular'
{
    import { WriterOptions, ParserOptions } from 'conventional-changelog-core';


    export default function createPreset(): Promise<{ parserOpts: ParserOptions, writerOpts: WriterOptions }>;
}