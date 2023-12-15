import conventionalChangelogWriter from 'conventional-changelog-writer'
import { Commit } from "conventional-commits-parser";


declare module 'conventional-changelog-writer'
{
    export function parseArray(commits: Commit[], ...args: Parameters<typeof conventionalChangelogWriter>): Promise<string>
}