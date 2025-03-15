const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
/**
 * Extracts parameter names from a function
 * @param func - The function to analyze
 * @returns Array of parameter names
 * @example
 * function test(a, b, c) {}
 * getParamNames(test); // Returns ['a', 'b', 'c']
 */
export function getParamNames(func: (...args: unknown[]) => unknown): string[]
{
    const fnStr = func.toString().replace(STRIP_COMMENTS, '')
    let result: string[] = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g)
    if (result === null)
        result = [];
    return result;
}

/**
 * Escapes special regex characters in a string
 * @param str - The string to escape
 * @returns Escaped string safe for regex construction
 * @example
 * escapeRegExp('Hello.world'); // Returns 'Hello\.world'
 */
export function escapeRegExp(str: string): string
{
    return str.replace(/[-[\]{}()*+?.\\^$|]/g, "\\$&");
}
