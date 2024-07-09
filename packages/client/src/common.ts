import { ctorToFunction, Module, module, defaultInjector, EventEmitter, SpecialNextParam, MiddlewarePromise, Event } from '@akala/core';

export const bootstrapModule: Module = module('akala', 'akala-services', 'controls')

bootstrapModule.activateEvent.maxListeners = 100;

export const serviceModule: Module = module('akala-services')

export function resolveUrl(namespace: string)
{
    const root = document.head.querySelector('base').href;
    return new URL(namespace, root).toString();
}

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
                    instance = ctorToFunction(target)(...args);
                    return instance;
                })();
            });
    };
}

import component, { webComponent } from './component.js';
import { Container, ICommandProcessor, Metadata, StructuredParameters } from '@akala/commands';
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

export { FormInjector, FormComposer } from './behaviors/form.js'
export { DataBind, DataContext } from './behaviors/context.js'
export * from './controlsv2/page.js'