import { inject, injectWithName, registerFactory } from './global-injector'

export function factory(name: string, ...toInject: string[])
{
    return function (target: Function)
    {
        let instance: IFactory<any> = null;
        const factory = function ()
        {
            if (!instance)
            {
                const args = [null];
                for (const arg in arguments)
                    args.push(arguments[arg]);
                instance = new (target.bind.apply(target, args))();
            }
            return instance.build();
        };

        if (toInject == null || toInject.length == 0)
            registerFactory(name, inject(factory));
        else
            registerFactory(name, injectWithName(toInject, factory));
    }
}

export interface IFactory<T>
{
    build(): T;
}

