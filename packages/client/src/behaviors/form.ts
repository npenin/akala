import { Container } from "@akala/commands";
import { Composer } from "../template.js";
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
        return this.form.elements[param]?.value;
    }
}

export class FormComposer implements Composer<Container<void>>
{
    constructor(private container?: Container<void>)
    {

    }

    readonly selector = 'form';

    optionGetter(options: object): Container<void>
    {
        return options['container'];
    }

    apply(form: HTMLFormElement, container?: Container<void>): Disposable//: Promise<IControlInstance<unknown>[]>
    {
        const abort = new AbortController()
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
        }, { signal: abort.signal })
        return {
            [Symbol.dispose]()
            {
                abort.abort();
            }
        }
    }

}