import * as akala from '@akala/core'
import { control, BaseControl, IControlInstance, GenericControlInstance, Control } from './control'
import { Promisify, Binding, isPromiseLike, inject, Injector } from '@akala/core'
import { IScope } from '../scope';

export type HTMLElementEventHandlerMap = { [P in keyof Partial<HTMLElementEventMap>]: (this: HTMLElement, ev: HTMLElementEventMap[P]) => any };


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
        var value: Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>;
        if (this.parameter instanceof Binding)
            value = this.parameter.getValue();
        else
            value = this.parameter;

        akala.Promisify(value).then((value) =>
        {
            akala.each(value, (handler, event) =>
            {
                var i = new Injector(injector);
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
export class Event extends GenericControlInstance<Function>
{
    constructor(private eventName: string)
    {
        super();
    }

    public init()
    {
        var handler = () =>
        {
            if (this.parameter instanceof Binding)
            {
                var value = this.parameter.getValue();
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

    public apply(parameter: Function)
    {
        if (parameter instanceof Function)
            return this.scope.$inject(parameter);
        console.error(`${parameter} is not a function`);
    }
}
