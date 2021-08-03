export enum Levels
{
    major = 0,
    minor = 1,
    patch = 2,
    decline = 3,
}

export default function <T extends string>(commits: { type: T }[], rules: { [key in T]: keyof Levels }): keyof Levels
{
    return Levels[(commits.reduce((previous, c) =>
    {
        if (!c.type)
            return previous;
        if (!(c.type in rules))
            console.warn('Unknown type ' + c.type);
        if (Levels[rules[c.type] as keyof Levels] < previous)
            return Levels[rules[c.type] as keyof Levels];
        return previous;
    }, Levels.decline))] as keyof Levels;
}