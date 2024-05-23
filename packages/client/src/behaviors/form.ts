import { Container } from "@akala/commands";
import { Composer } from "../template.js";
import { IScope } from "../scope.js";
import { Injector } from "@akala/core";

export class FormInjector extends Injector
{
    onResolve<T = unknown>(name: string | symbol): PromiseLike<T>;
    onResolve<T = unknown>(name: string | symbol, handler: (value: T) => void): void;
    onResolve<T>(name: string | symbol, handler?: (value: T) => void): void | PromiseLike<T>
    {
        if (!handler)
        {
            this.onResolve(name).then(handler);
        }
        return Promise.resolve(this.form.elements[name].value)
    }
    constructor(public form: HTMLFormElement)
    {
        super();
    }

    public inspect()
    {
        console.log(this.form.elements);
    }

    resolve<T = unknown>(param: string): T
    {
        return this.form.elements[param].value;
    }
}

export class FormComposer implements Composer<Container<void>>
{
    constructor(private container?: Container<void>)
    {

    }

    readonly selector = 'form';
    readonly optionName = 'container'
    async apply(form: HTMLFormElement, container?: Container<void>)//: Promise<IControlInstance<unknown>[]>
    {
        form.addEventListener('submit', async (ev) =>
        {
            ev.preventDefault();
            try
            {
                await (container || this.container).dispatch(form.action.substring(document.baseURI.length), { _trigger: 'html', param: [], form: new FormInjector(form), element: form, document: document });
            }
            catch (e)
            {
                console.error(e);
            }
        })
        return Promise.resolve()
    }

}