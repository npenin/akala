import * as core from '@akala/core';
import { promisify } from 'util';


export var $$injector: core.Module = window['akala'] = core.extend(core.module('akala', 'akala-services', 'controls'),
    {
        promisify: core.Promisify,
        isPromiseLike: core.isPromiseLike,
        Binding: core.Binding,
        ObservableArray: core.ObservableArray,
        map: core.map,
        each: core.each,
        eachAsync: core.eachAsync,
        extend: core.extend
    });

declare global
{
    namespace akala
    {
        export var promisify: typeof core.Promisify;
        export var isPromiseLike: typeof core.isPromiseLike;
        export var map: typeof core.map;
        export var each: typeof core.each;
        export var eachAsync: typeof core.eachAsync;
        export var extend: typeof core.extend;
        export var Binding :typeof core.Binding;
        export var ObservableArray: typeof core.ObservableArray;
        export type Translator = core.Translator;
        export var inject: typeof core.inject;
        export var injectNew: typeof core.injectNew;
        export var injectNewWithName: typeof core.injectNewWithName;
        export var injectWithName: typeof core.injectWithName;
        export var injectWithNameAsync: typeof core.injectWithNameAsync;
    }
}

export var serviceModule: core.Module = core.module('akala-services')

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: any[]) => any)
    {
        var instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, function () 
                {
                    var args = [null];
                    for (var i = 0; i < arguments.length; i++)
                        args[i + 1] = arguments[i];
                    return instance = new (Function.prototype.bind.apply(target, args));
                })();
            });
    };
}