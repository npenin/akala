export type NextFunction = (error?, ...args: any[]) => void;

export function array<T>(array: T[], body: (element: T, i: number, next: NextFunction) => void, complete: NextFunction)
{
    var loop = function (i)
    {
        if (i == array.length)
            complete();
        else
            try
            {
                body(array[i], i, function (error?)
                {
                    if (error)
                        complete(error);
                    else
                        setImmediate(loop, i + 1)
                });
            }
            catch (e)
            {
                complete(e);
            }
    }
    loop(0);
}

export function object(o: any, body: (element: any, i: string, next: NextFunction) => void, complete: NextFunction)
{
    array(Object.keys(o), function (key, i, next)
    {
        body(o[key], key, next);
    }, complete);
}

export function each<T>(array: T[], body: (element: T, i: number, next: NextFunction) => void, complete: NextFunction)
export function each(o: any, body: (element: any, i: string, next: NextFunction) => void, complete: NextFunction)
export function each(it: any, body: (element: any, i: any, next: NextFunction) => void, complete: NextFunction)
{
    if (Array.isArray(it) || typeof (it['length']) != 'undefined')
        return array(it, body, complete);
    return object(it, body, complete);
}