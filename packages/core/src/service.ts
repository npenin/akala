import { injectWithName, registerFactory } from './global-injector'

export function service(name: string, ...toInject: string[])
{
    return function (target: any)
    {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            registerFactory(name, function ()
            {
                return instance || injectWithName(toInject, function () 
                {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    }
}