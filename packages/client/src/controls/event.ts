import * as akala from '@akala/core'
import { control, GenericControlInstance, Control } from './control.js'
import { Binding, isPromiseLike, inject, Injector } from '@akala/core'

export type HTMLElementEventHandlerMap = { [P in keyof Partial<HTMLElementEventMap>]: (this: HTMLElement, ev: HTMLElementEventMap[P]) => void | boolean };


@control('events', 400)
export class Events extends GenericControlInstance<Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>>
{
    events: Event[] = [];

    constructor()
    {
        super();
    }

    public init(@inject('$injector') injector?: Injector)
    {
        let value: Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>;
        if (this.parameter instanceof Binding)
            value = this.parameter.getValue();
        else
            value = this.parameter;

        akala.Promisify(value).then((value) =>
        {
            akala.each(value, (handler, event) =>
            {
                const i = new Injector(injector);
                i.register('parameter', handler);
                this.events.push(new Event(event));
            })
        })
    }

    public dispose()
    {
        super.dispose();
        this.events.forEach(e => e.dispose());
    }
}

@akala.useInjector(Control.injector)
export class Event extends GenericControlInstance<(...args: unknown[]) => unknown>
{
    constructor(private eventName: string)
    {
        super();
    }

    public init()
    {
        const handler = () =>
        {
            if (this.parameter instanceof Binding)
            {
                const value = this.parameter.getValue();
                if (isPromiseLike(value))
                {
                    value.then((value) => this.apply(value));
                }
                this.apply(value)
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
