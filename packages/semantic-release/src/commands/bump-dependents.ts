import { Levels } from "./recommend-bump";

type Workspace = { location: string, name: string, workspaceDependencies: string[], bump: keyof Levels };

export default function (workspaces: Workspace[], rules?: { [key: string]: string })
{
    const translatedVersions: Record<string, Levels> = Object.fromEntries(workspaces.map(entry => [entry.name, Levels[entry.bump]]));
    const translatedRules: Record<Levels, Levels> = Object.fromEntries(Object.entries(rules).map(entry => [Levels[entry[0]], Levels[entry[1]]]));

    var loopCounts = workspaces.length;
    do
    {
        var hasChange = false;
        workspaces.forEach(w =>
        {
            var newVersion: Levels = (w.workspaceDependencies.reduce((previous: Levels, c) =>
            {
                if (translatedRules[translatedVersions[c]] < previous)
                    return translatedRules[translatedVersions[c]];
                return previous;
            }, translatedVersions[w.name]));
            if (newVersion < translatedVersions[w.name])
            {
                hasChange = true;
                translatedVersions[w.name] = newVersion;
            }
        });
        loopCounts--;
    }
    while (hasChange && loopCounts > 0);

    console.log(translatedVersions);
    if (loopCounts == 0)
        throw new Error('too many loops');
    else
        console.debug(`completed in ${workspaces.length - loopCounts} loops`);
    return Object.entries(translatedVersions).filter(e => e[1] != Levels.decline).map(entry => Object.assign(workspaces.find(w => w.name == entry[0]), { bump: Levels[entry[1]] }));
}