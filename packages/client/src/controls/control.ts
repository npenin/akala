import * as akala from '@akala/core';
import { IScope } from '../scope';
import { applyTemplate } from '../template';
import { useInjector, Injector, inject, isPromiseLike } from '@akala/core';


export function control<T = any>(name: string, priority?: number, options?: { scope?: boolean })
{
    return function <TClass extends { new(...args: any[]): TInstance }, TInstance extends IControlInstance<T>>(ctrl: TClass)
    {
        Control.injector.activateNew()(
            class extends Control<T> {

                constructor()
                {
                    super(name, priority);
                    this.scope = options?.scope;
                }

                public scope?: boolean;

                public instanciate(target: any, element: Element, parameter: akala.Binding | T)
                {
                    var i = new Injector(Control.injector)
                    i.register('factory', this);
                    i.register('scope', target);
                    i.register('element', element);
                    i.register('parameter', parameter);
                    return new result(i);
                }
            });

        var result = akala.injectable(ctrl);

        return result;
    }
}

export function controlFactory(...toInject: string[])
{
    return Control.injector.activateNew(...toInject);
}

export abstract class Control<T> implements IControl<T>
{
    public static injector: akala.Module = akala.module('controls', 'akala-services');

    constructor(private $$name: string, public priority: number = 500)
    {
        Control.injector.register($$name, this);
    }

    public static async apply(controls: any, element: Element, scope?: any): Promise<IControlInstance<any>[]>
    {
        var applicableControls: Control<any>[] = [];
        var requiresNewScope = false;
        Object.keys(controls).forEach(function (key)
        {
            var control: Control<any> = Control.injector.resolve(key);
            if (control)
            {
                applicableControls.push(control);
                if (control.scope)
                    requiresNewScope = true;
            }
            else
                console.error('missing control ' + key);
        });

        applicableControls.sort(function (a, b) { return a.priority - b.priority });

        if (!scope)
            scope = element['$scope'];
        if (requiresNewScope)
        {
            scope = scope.$new();
            element['$scope'] = scope;
        }

        var instances: IControlInstance<any>[] = [];
        for (var control of applicableControls)
        {
            var controlSettings = controls[control.$$name];
            if (controlSettings instanceof Function)
                controlSettings = controlSettings(scope, true);
            var controlInstance = await control.instanciate(scope, element, controlSettings, controls, instances);
            instances.push(controlInstance);
        };
        await akala.eachAsync(element.querySelectorAll('[data-bind]'), async function (el: HTMLElement)
        {
            if (el.parentElement.closest('[data-bind]') == element)
                instances.push(...await applyTemplate([el], scope, element));
        });
        return instances;
    }

    public wrap(element: HTMLElement, scope: IScope<any>, newControls?: any)
    {
        if (newControls)
        {
            var controls: any = akala.Parser.parse(element.dataset['bind'], true);

            var applicableControls: Control<any>[] = [];

            Object.keys(controls).forEach(function (key)
            {
                var control: Control<any> = Control.injector.resolve(key);
                if (control)
                    applicableControls.push(control);
                else
                    console.error('missing control ' + key);
            });

            applicableControls.sort(function (a, b) { return a.priority - b.priority });

            applicableControls = applicableControls.slice(applicableControls.indexOf(this) + 1);

            newControls = {};

            applicableControls.forEach(function (control)
            {
                newControls[control.$$name] = controls[control.$$name];
            });
        }

        return Control.apply(newControls, element, scope);
    }

    public abstract instanciate(target: any, element: Element, parameter: akala.Binding | T, controls?: any, instances?: IControlInstance<any>[]): IControlInstance<T> | PromiseLike<IControlInstance<T>>;

    public scope?: any | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    @inject('$injector')
    private injector: Injector

    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public async instanciate(scope: IScope<any>, element: Element, parameter: akala.Binding | T)
    {
        var injector = new Injector(this.injector);
        injector.setInjectables({ scope, element, parameter, factory: this, $injector: injector });
        return injector.injectNew<GenericControlInstance<T>>(GenericControlInstance)();
    }
}

@akala.injectable
export class GenericControlInstance<TParameter, TScope = any> implements IControlInstance<TParameter>
{
    protected stopWatches: (() => void)[] = [];

    protected async clone(element: HTMLElement, scope: IScope<any>, newControls?: any)
    {
        var clone = element.cloneNode(true) as HTMLElement;
        clone['$scope'] = scope;
        await this.factory.wrap(clone, scope, newControls);
        return clone;
    }

    @inject()
    protected factory: Control<TParameter>;
    @inject()
    protected readonly scope: IScope<TScope>;
    @inject()
    protected readonly element: HTMLElement;
    @inject()
    protected parameter: akala.Binding | TParameter

    @inject('$injector')
    protected readonly injector: Injector;

    constructor()
    {
    }

    public [akala.afterInjectSymbol]()
    {
        this.init();
    }

    init()
    {
    }

    public dispose()
    {
        this.stopWatches.forEach(f => f());
    }
}

export interface IControl<T>
{
    priority: number;

    instanciate(scope: IScope<any>, element: Element, parameter: akala.Binding | T): IControlInstance<T> | PromiseLike<IControlInstance<T>>; // void | Element | PromiseLike<Element | ArrayLike<Element>> | ArrayLike<Element>

}

export interface IControlInstance<T>
{
    dispose(): void;

    init?(): void;
}