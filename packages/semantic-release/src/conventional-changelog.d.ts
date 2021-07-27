declare module 'conventional-changelog-angular'
{

    interface ParserOpts
    {
        headerPattern: RegExp;
        headerCorrespondence: (string | 'type')[];
        noteKeywords: string[];
    }

    const x: Promise<{ parserOpts: ParserOpts }>;

    export = x;
}
