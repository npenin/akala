
export function toCamelCase(s: string): string
{
    if (s.length)
        return s[0].toLowerCase() + toCamelPascalShared(s.slice(1));
}

function toCamelPascalShared(s: string)
{
    return s.length ? s.replace(/(?:[- _]([a-zA-Z]))/g, (_all, letter) => (letter).toUpperCase()) : s;
}

export function toPascalCase(s: string): string
{
    if (s.length)
        return s[0].toUpperCase() + toCamelPascalShared(s.slice(1));
    return s;
}

export function toKebabCase(s: string): string
{
    return s.replace(/(?:[- _]([a-zA-Z]))|([A-Z])/g, (_all, letter, upperLetter, index) => (index == 0 ? '' : '-') + (letter || upperLetter).toLowerCase());
}

export function toSnakeCase(s: string): string
{
    return s.replace(/(?:[- _]([a-zA-Z]))|([A-Z])/g, (_all, letter, upperLetter, index) => (index == 0 ? '' : '_') + (letter || upperLetter).toLowerCase());
}
