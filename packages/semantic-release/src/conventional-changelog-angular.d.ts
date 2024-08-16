declare module 'conventional-changelog-angular'
{
    import { Options as WriterOptions } from 'conventional-changelog-writer';
    import { Commit, ParserOptions } from 'conventional-commits-parser';


    export default function createPreset(): Promise<{ parser: ParserOptions, writer: WriterOptions<Commit> }>;
}