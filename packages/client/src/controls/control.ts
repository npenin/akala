import * as akala from '@akala/core';
import { IScope } from '../scope';
import { Injector, inject, ObservableArray, ParsedObject } from '@akala/core';
import { Template } from '../template';
import { Binding } from '@akala/core'


export function control<T = unknown>(name: string, priority?: number, options?: { scope?: boolean })
{
    return function <TClass extends { new(...args: unknown[]): TInstance }, TInstance extends IControlInstance<T>>(ctrl: TClass)
    {
        Control.injector.activateNew()(
            class extends Control<T> {

                constructor()
                {
                    super(name, priority);
                    this.scope = options?.scope;
                }

                public instanciate(target: unknown, element: Element, parameter: ControlParameter<T>, otherControls: Record<string, unknown>)
                {
                    const i = new Injector(Control.injector)
                    i.register('factory', this);
                    i.register('scope', target);
                    i.register('element', element);
                    i.register('parameter', parameter);
                    i.register('controls', otherControls);
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

    public static async apply(controls: Record<string, unknown>, element: Element, scope?: IScope<unknown>): Promise<IControlInstance<unknown>[]>
    {
        const applicableControls: Control<unknown>[] = [];
        let requiresNewScope = false;
        Object.keys(controls).forEach(function (key)
        {
            const control: Control<unknown> = Control.injector.resolve(key);
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

        const instances: IControlInstance<unknown>[] = [];
        for (const control of applicableControls)
        {
            let controlSettings = controls[control.$$name];
            if (controlSettings instanceof Function)
                controlSettings = controlSettings(scope, true);
            const controlInstance = await control.instanciate(scope, element, controlSettings, controls, instances);
            instances.push(controlInstance);
        }

        return instances;
    }

    public wrap(element: HTMLElement, scope: IScope<unknown>, newControls?: Record<string, unknown> | boolean)
    {
        if (newControls)
        {
            const controls = new akala.Parser().parse(element.dataset['bind']) as ParsedObject;

            let applicableControls: Control<unknown>[] = [];

            controls.init.forEach(function (member)
            {
                const control: Control<unknown> = Control.injector.resolve(member.member);
                if (control)
                    applicableControls.push(control);
                else
                    console.error('missing control ' + member.member);
            });

            applicableControls.sort(function (a, b) { return a.priority - b.priority });

            applicableControls = applicableControls.slice(applicableControls.indexOf(this) + 1);

            newControls = {};

            applicableControls.forEach(function (control)
            {
                newControls[control.$$name] = controls[control.$$name];
            });

        }

        return Template.composeAll([element], scope, undefined, { databind: newControls });
    }

    public abstract instanciate(target: unknown, element: Element, parameter: ControlParameter<T>, controls?: Record<string, unknown>, instances?: IControlInstance<unknown>[]): IControlInstance<T> | PromiseLike<IControlInstance<T>>;

    public scope?: unknown | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    @inject('$injector')
    private injector: Injector

    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public async instanciate(scope: IScope<unknown>, element: Element, parameter: ControlParameter<T>)
    {
        const injector = new Injector(this.injector);
        injector.setInjectables({ scope, element, parameter, factory: this, $injector: injector });
        return injector.injectNew<GenericControlInstance<T>>(GenericControlInstance)();
    }
}

export type ControlControlParameter<T> = T extends GenericControlInstance<infer TParameter> ? ControlParameter<TParameter> : never;
export type ControlParameter<TParameter> = Binding<TParameter> | (TParameter extends (infer X)[] ? ObservableArray<X> | TParameter : TParameter);

@akala.injectable
export class GenericControlInstance<TParameter, TScope extends IScope<unknown> = IScope<unknown>> implements IControlInstance<TParameter>
{
    protected stopWatches: (() => (void | Promise<void>))[] = [];

    protected async clone(element: HTMLElement, scope: TScope, newControls?: Record<string, unknown> | boolean)
    {
        const clone = element.cloneNode(true) as HTMLElement;
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
    protected parameter: akala.Binding<TParameter> | TParameter

    @inject('$injector')
    protected readonly injector: Injector;

    public [akala.afterInjectSymbol]()
    {
        this.init();
    }

    init()
    // eslint-disable-next-line @typescript-eslint/no-empty-function
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

    instanciate(scope: IScope<unknown>, element: Element, parameter: ControlParameter<T>): IControlInstance<T> | PromiseLike<IControlInstance<T>>; // void | Element | PromiseLike<Element | ArrayLike<Element>> | ArrayLike<Element>

}

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IControlInstance<T>
{
    dispose(): void;

    init?(): void;
}