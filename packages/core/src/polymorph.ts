
export function polymorph(...types: ('string' | 'number' | 'boolean' | 'function' | 'object' | 'symbol')[])
{
    types.reduce((previous, current, i) =>
    {
        if (previous == current)
            console.warn(`there might be a conflict in polymorphism since types at position ${i - 1} and ${i} are identical`);
        return current;
    }, '')

    return function <T extends (...args: unknown[]) => unknown>(oldF: T)
    {
        return function (...args)
        {
            const finalArgs = [];
            let argsIndex = 0;
            for (let i = 0; i < types.length; i++)
            {
                if (typeof (args[argsIndex]) == types[i])
                {
                    finalArgs[i] = args[argsIndex]
                    argsIndex++;
                }
            }
            return oldF.apply(this, finalArgs);
        } as T
    };
}

export function Polymorph(...types: ('string' | 'number' | 'boolean' | 'function' | 'object' | 'symbol')[])
{
    const readyToPolymorph = polymorph(...types);

    return function <T extends (...args: unknown[]) => unknown>(target: new (...args: unknown[]) => unknown, propertyKey?: string, descriptor?: TypedPropertyDescriptor<T>)
    {
        descriptor.value = readyToPolymorph(descriptor.value)
    };
}