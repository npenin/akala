import { Module, InjectableConstructor, injectable } from "@akala/core";

export default function (module: Module, ...toInject: string[])
{
    return function <TInstance, TClass extends { new(...args: any[]): TInstance }>(ctor: TClass): TClass
    {
        var cl = injectable(ctor);
        module.activateNew(...toInject)(cl);
        return cl;
    }
}