
declare module 'conventional-changelog-angular'
{
    import { WriterOptions, ParserOptions } from 'conventional-changelog-core';

    const x: Promise<{ parserOpts: ParserOptions, writerOpts: WriterOptions }>;

    export default x;
}