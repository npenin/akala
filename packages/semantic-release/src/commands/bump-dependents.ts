import { CliContext } from "@akala/cli";
import { Levels } from "./recommend-bump";

type Workspace = { location: string, name: string, workspaceDependencies: string[], bump: keyof Levels };

export default function (this: CliContext, workspaces: Workspace[], rules?: { [key: string]: string })
{
    const translatedVersions: Record<string, Levels> = Object.fromEntries(workspaces.map(entry => [entry.location, Levels[entry.bump]]));
    const translatedRules: Record<Levels, Levels> = Object.fromEntries(Object.entries(rules).map(entry => [Levels[entry[0]], Levels[entry[1]]]));

    this.logger.debug(translatedRules)
    this.logger.debug(translatedVersions)
    var loopCounts = workspaces.length;
    do
    {
        var hasChange = false;
        workspaces.forEach(w =>
        {
            var newVersion: Levels = (w.workspaceDependencies && w.workspaceDependencies.reduce((previous: Levels, c) =>
            {
                this.logger.debug(`${c} is ${translatedVersions[c]} and ${w.name} is ${previous}`);

                if (translatedRules[translatedVersions[c]] < previous)
                    return translatedRules[translatedVersions[c]];
                return previous;
            }, translatedVersions[w.location])) || translatedVersions[w.location];
            if (newVersion < translatedVersions[w.location])
            {
                hasChange = true;
                translatedVersions[w.location] = newVersion;
            }
        });
        loopCounts--;
    }
    while (hasChange && loopCounts > 0);

    this.logger.debug(translatedVersions);
    if (loopCounts == 0)
        throw new Error('too many loops');
    else
        this.logger.verbose(`completed in ${workspaces.length - loopCounts} loops`);
    return Object.entries(translatedVersions).filter(e => e[1] != Levels.decline).map(entry => Object.assign(workspaces.find(w => w.location == entry[0]), { bump: Levels[entry[1]] }));
}