
/**
 * Converts a string to camelCase format.
 * @param s - The input string to convert.
 * @returns The camelCased string.
 * @example toCamelCase('hello_world') // 'helloWorld'
 */
export function toCamelCase(s: string): string
{
    if (s.length)
    {
        return s[0].toLowerCase() + toCamelPascalShared(s.slice(1));
    }
    return s;
}

/**
 * Internal helper function for converting strings to camelCase/PascalCase.
 * @param s - The input string slice to process.
 * @returns The converted string segment.
 */
function toCamelPascalShared(s: string)
{
    return s.length
        ? s.replace(/(?:[- _]([a-zA-Z]))/g, (_, letter) => letter.toUpperCase())
        : s;
}

/**
 * Converts a string to PascalCase format.
 * @param s - The input string to convert.
 * @returns The PascalCased string.
 * @example toPascalCase('hello-world') // 'HelloWorld'
 */
export function toPascalCase(s: string): string
{
    if (s.length)
    {
        return s[0].toUpperCase() + toCamelPascalShared(s.slice(1));
    }
    return s;
}

/**
 * Converts a string to kebab-case format.
 * @param s - The input string to convert.
 * @returns The kebab-cased string.
 * @example toKebabCase('helloWorld') // 'hello-world'
 */
export function toKebabCase(s: string): string
{
    return s.replace(/(?:[- _]([a-zA-Z]))|([A-Z])/g, (_all, letter, upperLetter, index) => (index == 0 ? '' : '-') + (letter || upperLetter).toLowerCase());
}

/**
 * Converts a string to snake_case format.
 * @param s - The input string to convert.
 * @returns The snake_cased string.
 * @example toSnakeCase('helloWorld') // 'hello_world'
 */
export function toSnakeCase(s: string): string
{
    return s.replace(/(?:[- _]([a-zA-Z]))|([A-Z])/g, (_all, letter, upperLetter, index) => (index == 0 ? '' : '_') + (letter || upperLetter).toLowerCase());
}
