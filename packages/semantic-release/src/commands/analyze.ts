import changelog = require('conventional-changelog-angular');


export default async function (commits: { hash: string, message: string }[])
{
    const parserOpts = (await changelog).parserOpts;
    return commits.map(c =>
    {
        const result: Record<string, string> & { breaks?: true } = { hash: c.hash } as any;
        var match = parserOpts.headerPattern.exec(c.message);
        if (match)
            parserOpts.headerCorrespondence.forEach((h, i) => result[h] = match[i + 1]);

        if (parserOpts.noteKeywords.reduce((previous, note) =>
        {
            if (previous !== -1)
                return previous;
            return c.message.indexOf(note)
        }, -1) !== -1)
            result.breaks = true;
        return result;
    });
}