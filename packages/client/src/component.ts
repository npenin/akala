import { Module, InjectableConstructor, injectable } from "@akala/core";

export default function (module: Module)
{
    return function <TInstance, TClass extends { new(...args: any[]): TInstance }>(ctor: TClass): TClass
    {
        var cl = injectable(ctor);
        module.activateNew('$injector')(cl);
        return cl;
    }
}