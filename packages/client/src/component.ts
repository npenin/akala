import { Argument2, Module, injectable } from "@akala/core";

export default function (module: Module)
{
    return function <TInstance, TClass extends { new(...args: unknown[]): TInstance }>(ctor: TClass): TClass
    {
        const cl = injectable(ctor);
        module.activateNew('$injector')(cl);
        return cl;
    }
}

export function webComponent(tag: string, options?: Argument2<CustomElementRegistry['define']>)
{
    return function <TInstance extends HTMLElement, TClass extends { new(...args: unknown[]): TInstance }>(ctor: TClass): TClass
    {
        const cl = injectable(ctor);
        customElements.define(tag, cl, options);
        return cl;
    }
}