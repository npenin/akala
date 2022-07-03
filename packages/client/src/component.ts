import { Module, injectable } from "@akala/core";

export default function (module: Module)
{
    return function <TInstance, TClass extends { new(...args: unknown[]): TInstance }>(ctor: TClass): TClass
    {
        const cl = injectable(ctor);
        module.activateNew('$injector')(cl);
        return cl;
    }
}