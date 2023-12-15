import conventionalChangelogWriter from "conventional-changelog-writer";
import angular from 'conventional-changelog-angular'
import { Commit } from "conventional-commits-parser";
import fs from 'fs/promises'

export default async function changelog(commits: Commit[], changelogPath: string)
{
    await fs.writeFile(changelogPath, conventionalChangelogWriter.parseArray(commits, {}, (await angular()).writerOpts));
}