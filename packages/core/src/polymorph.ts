
declare let a: unknown;
const b = typeof a;
type Types = typeof b;

/**
 * Creates a type-based polymorphic function wrapper
 * @function polymorph
 * @param {...string} types - Ordered list of expected argument types
 * @returns {Function} Decorator function that wraps the original function with type checking
 * @example
 * const polyFunc = polymorph('boolean', 'number', 'number')((a, b, c) => a ? (b??0) * (c??0): (b??0) + (c??0));
 * polyFunc(10); // 10
 * polyFunc(10,10); // "20"
 * polyFunc(true, 10, 10);   // 100
 */
export function polymorph(...types: readonly Types[])
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

/**
 * Decorator factory for creating polymorphic methods
 * @function Polymorph
 * @param {...string} types - Ordered list of expected argument types
 * @returns {MethodDecorator} Decorator that applies polymorphic type handling to a method
 * @example
 * class Calculator {
 *   @Polymorph('string', 'number', 'number')
 *   operate(mult, b, c) { return mult ? (b??0) * (c??0): (b??0) + (c??0); }
 * }
 * 
 * const calc = new Calculator();
 * calc.operate(10); // 10
 * calc.operate(10,10); // "20"
 * calc.operate(true, 10, 10);   // 100
 */
export function Polymorph(...types: Types[])
{
    const readyToPolymorph = polymorph(...types);

    return function <T extends (...args: unknown[]) => unknown>(target: new (...args: unknown[]) => unknown, propertyKey?: string, descriptor?: TypedPropertyDescriptor<T>)
    {
        descriptor.value = readyToPolymorph(descriptor.value)
    };
}
