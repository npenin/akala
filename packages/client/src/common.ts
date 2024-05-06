import { ctorToFunction, Module, module, defaultInjector, EventEmitter, SpecialNextParam, MiddlewarePromise, Event, Injector } from '@akala/core';

export var bootstrapModule: Module = module('akala', 'akala-services', 'controls')

bootstrapModule.activateEvent.maxListeners = 100;

export var serviceModule: Module = module('akala-services')

export function resolveUrl(namespace: string)
{
    const root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

import { IControlInstance } from './controls/control.js';
export { IControlInstance }

defaultInjector.register('$resolveUrl', resolveUrl)

export function service(name, ...toInject: string[])
{
    return function (target: new (...args: unknown[]) => unknown)
    {
        let instance = null;
        if (toInject == null || toInject.length == 0 && target.length > 0)
            throw new Error('missing inject names');
        else
            serviceModule.registerFactory(name, function ()
            {
                return instance || serviceModule.injectWithName(toInject, (...args: unknown[]) =>
                {
                    return instance = ctorToFunction(target)(...args);

                })();
            });
    };
}

import component, { webComponent } from './component.js';
import { Container, ICommandProcessor, Metadata, StructuredParameters } from '@akala/commands';
import { Composer } from './template.js';
import { IScope } from './scope.js';
export { component, webComponent };


export class LocalAfterRemoteProcessor implements ICommandProcessor
{
    constructor(private inner: ICommandProcessor, public readonly eventEmitter: EventEmitter<Record<string, Event<[any, StructuredParameters<unknown[]>, Metadata.Command]>>> = new EventEmitter())
    {
    }

    async handle(origin: Container<unknown>, cmd: Metadata.Command, param: StructuredParameters<unknown[]>): MiddlewarePromise<SpecialNextParam>
    {
        try
        {
            const error = await this.inner.handle(origin, cmd, param);
            return error;
        }
        catch (e)
        {
            if (!this.eventEmitter.emit(cmd.name, e, param, cmd))
                throw e;
        }
    }

}


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
    async apply(form: HTMLFormElement, scope: IScope<{ container?: Container<void> }>): Promise<IControlInstance<unknown>[]>
    {
        form.addEventListener('submit', async (ev) =>
        {
            ev.preventDefault();
            try
            {
                await (scope['container'] || this.container).dispatch(form.action.substring(document.baseURI.length), { _trigger: 'html', param: [], form: new FormInjector(form), element: form, document: document });
            }
            catch (e)
            {
                console.error(e);
            }
        })
        return Promise.resolve([])
    }

}