import changelog from 'conventional-changelog-angular';
import { Commit as ParserCommit } from 'conventional-commits-parser';
import { Commit } from './parse.js';

const noteKeywords = ['BREAKING CHANGE', 'BREAKING-CHANGE'];
const noteKeywordsSelection = noteKeywords.join('|');
const noteKeywordsPattern = new RegExp('^[\\s|*]*(' + noteKeywordsSelection + ')[:\\s]+(.*)')

export default async function (commits: Commit[]): Promise<ParserCommit[]>
{
    const parserOpts = (await changelog()).parserOpts;
    const headerPattern: RegExp = typeof parserOpts.headerPattern == 'string' ? new RegExp(parserOpts.headerPattern) : parserOpts.headerPattern;
    const headerCorrespondence: string[] = typeof parserOpts.headerCorrespondence == 'string' ? [parserOpts.headerCorrespondence] : parserOpts.headerCorrespondence;

    return commits.map(c =>
    {
        const lines = c.message.split('\n').map(l => l.trim());

        const result = { hash: c.hash, notes: [], body: '', merge: '', header: '', footer: '', references: [], mentions: [], revert: null } as unknown as ParserCommit;
        const body: string[] = [];
        const footer: string[] = [];

        lines.forEach((l, i) =>
        {
            if (i == 0)
            {
                result.header = l;
                const match = headerPattern.exec(l);
                if (match)
                    headerCorrespondence.forEach((h, i) => result[h] = match[i + 1]);

                return;
            }

            const notesMatch = l.match(noteKeywordsPattern);
            var isBody = true;
            if (notesMatch)
            {
                isBody = false;
            }

            if (isBody)
                body.push(l);
            else
            {
                footer.push(l);

                result.notes.push({
                    title: notesMatch[1],
                    text: notesMatch[2]
                });
            }

        })
        return result;
    });
}