const STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
export function getParamNames(func: (...args: unknown[]) => unknown): string[]
{
    const fnStr = func.toString().replace(STRIP_COMMENTS, '')
    let result: string[] = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g)
    if (result === null)
        result = [];
    return result;
}

export function escapeRegExp(str: string): string
{
    return str.replace(/[-[\]{}()*+?.\\^$|]/g, "\\$&");
}