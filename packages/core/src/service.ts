import { injectWithName, registerFactory } from './global-injector'

export function service(name: string, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            registerFactory(name, function ()
            {
                return instance || injectWithName(toInject, function (...parameters: unknown[]) 
                {
                    const args = [null];
                    for (let i = 0; i < parameters.length; i++)
                        args[i + 1] = parameters[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    }
}