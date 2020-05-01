import * as akala from '@akala/core'
import { control, BaseControl } from './control'
import { Promisify, Binding, isPromiseLike } from '@akala/core'
import { IScope } from '../scope';

export type HTMLElementEventHandlerMap = { [P in keyof Partial<HTMLElementEventMap>]: (this: HTMLElement, ev: HTMLElementEventMap[P]) => any };

@control()
export class Events extends BaseControl<Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>>
{
    constructor()
    {
        super('event', 400)
    }

    public link(scope: IScope<any>, element: Element, parameter: Binding | Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>)
    {
        var value: Partial<HTMLElementEventHandlerMap> | PromiseLike<Partial<HTMLElementEventHandlerMap>>;
        if (parameter instanceof Binding)
            value = parameter.getValue();
        else
            value = parameter;

        akala.Promisify(value).then(function (value)
        {
            akala.each(value, function (handler, event)
            {
                element.addEventListener(event, () =>
                {
                    if (handler instanceof Binding)
                    {
                        var value: (this: HTMLElement, ev: HTMLElementEventMap[typeof event]) => any = handler.getValue();
                        if (isPromiseLike(value))
                        {
                            value.then(function (value)
                            {
                                if (value instanceof Function)
                                    return scope.$inject(value);
                            })
                        }
                        if (value instanceof Function)
                            return scope.$inject(value);
                    }
                    else
                        return scope.$inject(handler);
                });

            })
        })

    }

    public apply(scope: IScope<any>, element: Element, parameter: Partial<HTMLElementEventHandlerMap>)
    {
        if (parameter instanceof Function)
            return scope.$inject(parameter);
        console.error(`${parameter} is not a function`);
    }
}


@control()
export class Event extends BaseControl<Function>
{
    constructor(private eventName: string)
    {
        super(eventName, 400)
    }

    public link(scope: IScope<any>, element: Element, parameter: Binding | Function)
    {
        element.addEventListener(this.eventName, () =>
        {
            if (parameter instanceof Binding)
            {
                var value = parameter.getValue();
                if (isPromiseLike(value))
                {
                    value.then((value) => this.apply(scope, element, value));
                }
                this.apply(scope, element, value)
            }
            else
                this.apply(scope, element, parameter)
        });

    }

    public apply(scope: IScope<any>, element: Element, parameter: Function)
    {
        if (parameter instanceof Function)
            return scope.$inject(parameter);
        console.error(`${parameter} is not a function`);
    }
}
