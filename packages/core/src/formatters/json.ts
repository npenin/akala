function json<T>(a: T): string
{
    return JSON.stringify(a);
}

json['reverse'] = function <T>(s: string)
{
    return JSON.parse(s);
}

export default json;
