import { control, GenericControlInstance, Control } from './control.js'
import { Binding, inject, Injector, useInjector, each, SimpleInjector } from '@akala/core'

export type HTMLElementEventHandlerMap = { [P in keyof Partial<HTMLElementEventMap>]: (this: HTMLElement, ev: HTMLElementEventMap[P]) => void | boolean };


@control('events', 400)
export class Events extends GenericControlInstance<Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>>
{
    events: Event[] = [];

    constructor()
    {
        super();
    }

    public async init(@inject('$injector') injector?: Injector)
    {
        let value: Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>;
        if (this.parameter instanceof Binding)
            value = await this.parameter.getValue();
        else
            value = this.parameter;

        Promise.resolve(value).then((value) =>
        {
            each(value, (handler, event) =>
            {
                const i = new SimpleInjector(injector);
                i.register('parameter', handler);
                this.events.push(new Event(event));
            })
        })
    }

    public [Symbol.dispose]()
    {
        super[Symbol.dispose]();
        this.events.forEach(e => e[Symbol.dispose]());
    }
}

@useInjector(Control.injector)
export class Event extends GenericControlInstance<(...args: unknown[]) => unknown>
{
    constructor(private eventName: string)
    {
        super();
    }

    public async init()
    {
        const handler = () =>
        {
            if (this.parameter instanceof Binding)
            {
                const value = this.parameter.getValue();
                this.apply(value);
            }
            else
                this.apply(this.parameter)
        };
        this.element.addEventListener(this.eventName, handler);
        this.stopWatches.push(() => this.element.removeEventListener(this.eventName, handler));
    }

    public apply(parameter: (...args: unknown[]) => unknown)
    {
        if (parameter instanceof Function)
            return this.scope.$inject(parameter);
        console.error(`${parameter} is not a function`);
    }
}
