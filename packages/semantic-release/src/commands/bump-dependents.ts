import { Levels } from "./recommend-bump";


export default function (workspaces: { location: string, name: string, workspaceDependencies: string[] }[], versions: { [key: string]: string }, rules?: { [key: string]: keyof Levels })
{
    const translatedVersions: Record<string, Levels> = Object.fromEntries(Object.entries(versions).map(entry => [entry[0], Levels[entry[1]]]));
    const translatedRules: Record<Levels, Levels> = Object.fromEntries(Object.entries(versions).map(entry => [Levels[entry[0]], Levels[entry[1]]]));

    var loopCounts = workspaces.length;
    do
    {
        var hasChange = false
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
                versions[w.name] = Levels[newVersion];
            }
        });
        loopCounts--;
    }
    while (hasChange && loopCounts > 0);

    console.log(versions);
    if (loopCounts == 0)
        throw new Error('too many loops');
    else
        console.debug(`completed in ${workspaces.length - loopCounts} loops`);
    return Object.entries(translatedVersions).map(entry => Object.assign({ bump: Levels[entry[1]] }, workspaces.find(w => w.name == entry[0]))).filter(e => e.bump != 'decline');
}