
export function polymorph(types: ('string' | 'number' | 'boolean' | 'function' | 'object' | 'symbol')[])
{
    types.reduce((previous, current, i) =>
    {
        if (previous == current)
            console.warn(`there might be a conflict in polymorphism since types at position ${i - 1} and ${i} are identical`);
        return current;
    }, '')

    return function <T extends Function>(oldF: T)
    {
        return function (...args)
        {
            var finalArgs = [];
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
        } as any
    };
}

export function Polymorph(types: ('string' | 'number' | 'boolean' | 'function' | 'object' | 'symbol')[])
{
    var readyToPolymorph = polymorph(types);

    return function <T extends Function>(target: any, propertyKey?: string, descriptor?: TypedPropertyDescriptor<T>)
    {
        descriptor.value = readyToPolymorph(descriptor.value)
    };
}