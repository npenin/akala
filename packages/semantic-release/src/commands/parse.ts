import { merge } from "../../../core/src/global-injector";


export default async function (commitsString: string)
{
    const commitIdRE = /^commit ([0-9a-f]{40})$/gm;
    const authorRE = /^Author:\s+([^<]+) <([^>]*)>$/gm;
    const mergeRE = /^Merge:\s+([0-9a-f]+)\s+([0-9a-f]+)\s*$/gm;
    const dateRE = /^Date:\s+((\d{4})-(\d{2})-(\d{2}) (\d+):(\d+):(\d+) ([+-]\d{4}))$/gm;
    const emptyLineRE = /\n\n|$/g;
    var commit: RegExpExecArray;
    const commits = [];
    let mergeMatch = mergeRE.exec(commitsString);
    while (commit = commitIdRE.exec(commitsString))
    {
        const commitId = commit[1];
        let authorMatch: RegExpExecArray;
        if (mergeMatch && mergeMatch.index == commit.index + commit[0].length + 1)
        {
            authorMatch = authorRE.exec(commitsString);
            if (authorMatch.index != mergeMatch.index + mergeMatch[0].length + 1)
                throw new Error(`invalid git format: unable to parse Author after Merge (${authorMatch.index}!=${mergeMatch.index}+${mergeMatch[0].length}+1)`);
            mergeMatch = mergeRE.exec(commitsString);
        }
        else
        {
            authorMatch = authorRE.exec(commitsString);
            if (authorMatch.index != commit.index + commit[0].length + 1)
                throw new Error('invalid git format: unable to parse Author\n' + commitsString.substring(Math.max(commitIdRE.lastIndex - 50, 0), Math.min(commitIdRE.lastIndex + 50, commitsString.length)));
        }
        const [_, nickname, mail] = authorMatch;
        const dateMatch = dateRE.exec(commitsString);
        if (dateMatch.index != authorMatch.index + authorMatch[0].length + 1)
            throw new Error('invalid git format');
        const date = new Date(Date.parse(dateMatch[1]));
        var index = dateMatch.index + dateMatch[0].length + 2;
        if (emptyLineRE.test(commitsString) && emptyLineRE.lastIndex !== index)
            throw new Error('invalid git format');

        if (!emptyLineRE.test(commitsString))
            throw new Error(`invalid git format: ${commitsString}`);

        commits.push({ hash: commitId, author: { nickname, mail }, message: commitsString.substring(index, emptyLineRE.lastIndex).replace(/(\n|^)(?:\t| {4})/g, '$1').trimEnd(), date })
    }
    return commits;
}