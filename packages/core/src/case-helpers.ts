import { escapeRegExp } from "./reflect.js";

/**
 * Converts a string to camelCase format.
 * @param s - The input string to convert.
 * @returns The camelCased string.
 * @example toCamelCase('hello_world') // 'helloWorld'
 */
export function toCamelCase(s: string, separators: string = defaultSeparators): string
{
    return s?.length ?
        s[0].toLowerCase() + toCamelPascalShared(s.slice(1))
        : s;
}

export const defaultSeparators = '- _/';
export const defaultCaseRegex = /(?:[- _\/]([a-zA-Z]))/g;
export const defaultSepRegex = /(?:[- _\/]([a-zA-Z]))|([A-Z])/g;

function getRegexpForSeparators(separators: string, includeCapitals: boolean)
{
    let pattern = `(?:[${escapeRegExp(separators)}]([a-zA-Z]))`;

    if (includeCapitals)
        pattern += '|([A-Z])';

    return new RegExp(pattern, 'g');
}

/**
 * Internal helper function for converting strings to camelCase/PascalCase.
 * @param s - The input string slice to process.
 * @returns The converted string segment.
 */
function toCamelPascalShared(s: string, separators: string = defaultSeparators)
{
    if (separators == defaultSeparators)
        return s?.length
            ? s.replace(defaultCaseRegex, (_, letter) => letter.toUpperCase())
            : s;
    else
        return s?.length
            ? s.replace(getRegexpForSeparators(separators, false), (_, letter) => letter.toUpperCase())
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
    return s?.length ?
        s[0].toUpperCase() + toCamelPascalShared(s.slice(1))
        : s;
}

/**
 * Converts a string to kebab-case format.
 * @param s - The input string to convert.
 * @returns The kebab-cased string.
 * @example toKebabCase('helloWorld') // 'hello-world'
 */
export function toKebabCase(s: string, separators: string = defaultSeparators): string
{
    return s.replace(getRegexpForSeparators(separators, true), (_all, letter, upperLetter, index) => (index == 0 ? '' : '-') + (letter || upperLetter).toLowerCase());
}

/**
 * Converts a string to snake_case format.
 * @param s - The input string to convert.
 * @returns The snake_cased string.
 * @example toSnakeCase('helloWorld') // 'hello_world'
 */
export function toSnakeCase(s: string, separators: string = defaultSeparators): string
{
    return s?.length ?
        s.replace(getRegexpForSeparators(separators, true), (_all, letter, upperLetter, index) => (index == 0 ? '' : '_') + (letter || upperLetter).toLowerCase()) : s;
}
