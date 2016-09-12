import {inject, injectWithName, registerFactory} from './injector'

export function factory(name: string, ...toInject: string[])
{
    return function (target: Function)
    {
        var instance:IFactory<any> = null;
        var factory = function ()
        {
            if (!instance)
                instance = new (target.bind.apply(target, [null].concat(arguments)))();
            instance.build.bind(instance);
            return instance.build;
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

