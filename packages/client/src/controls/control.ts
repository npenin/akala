import { IScope } from '../scope.js';
import { Injector, inject, ObservableArray, ParsedObject, parser, Parser, SimpleInjector, injectable, Module, module as klModule, afterInjectSymbol, InjectorEvaluator, each } from '@akala/core';
import { Template, Composer, CompositeDisposable } from '../template.js';
import { Binding } from '@akala/core'


export class DataBindComposer implements Composer<Record<string, unknown>>
{
    selector = '[data-bind]';
    optionName = 'databind';
    apply(item: HTMLElement, data: unknown, options?: Record<string, Control<unknown>>)
    {
        const instances: Disposable[] = Control.apply(options || (new parser.EvaluatorAsFunction().eval(new Parser().parse(item.dataset['bind'])))() as Record<string, unknown>, item);

        each(item.querySelectorAll(this.selector), async (el: HTMLElement) =>
        {
            if (el.parentElement.closest(this.selector) == item)
                instances.push(await Template.compose(this, [el], item));
        });

        return new CompositeDisposable(instances);
    }
}

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
                    const i = new SimpleInjector(Control.injector)
                    i.register('factory', this);
                    i.register('scope', target);
                    i.register('element', element);
                    i.register('parameter', parameter);
                    i.register('controls', otherControls);
                    return new result(i);
                }
            });

        var result = injectable(ctrl, Control.injector);

        return result;
    }
}

export function controlFactory(...toInject: string[])
{
    return Control.injector.activateNew(...toInject);
}

export abstract class Control<T> implements IControl<T>
{
    public static injector: Module = (function () { const module = klModule('controls', 'akala-services'); module.activateEvent.maxListeners = 0; return module })();

    constructor(private $$name: string, public priority: number = 500)
    {
        Control.injector.register($$name, this);
    }

    public static apply(controls: Record<string, unknown>, element: Element, scope?: IScope<object>): IControlInstance<unknown>[]
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
            const controlInstance = control.instanciate(scope, element, controlSettings, controls, instances);
            instances.push(controlInstance);
        }

        return instances;
    }

    public wrap(element: HTMLElement, scope: IScope<object>, newControls?: Record<string, unknown> | boolean)
    {
        if (newControls)
        {
            const controls = new Parser().parse(element.dataset['bind']) as ParsedObject;

            let applicableControls: Control<any>[] = [];

            controls.init.forEach(function (member)
            {
                const control: Control<unknown> = new InjectorEvaluator(Control.injector).eval(member.member);
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

        return Template.composeAll([element], undefined, { databind: newControls });
    }

    public abstract instanciate(target: unknown, element: Element, parameter: ControlParameter<T>, controls?: Record<string, unknown>, instances?: IControlInstance<unknown>[]): IControlInstance<T>;

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

    public instanciate(scope: IScope<object>, element: Element, parameter: ControlParameter<T>)
    {
        const injector = new SimpleInjector(this.injector);
        injector.setInjectables({ scope, element, parameter, factory: this, $injector: injector });
        return injector.injectNew<GenericControlInstance<T>>(GenericControlInstance)();
    }
}

export type ControlControlParameter<T> = T extends GenericControlInstance<infer TParameter> ? ControlParameter<TParameter> : never;
export type ControlParameter<TParameter> = Binding<TParameter> | (TParameter extends (infer X)[] ? ObservableArray<X> | TParameter : TParameter);

@injectable
export class GenericControlInstance<TParameter, TScope extends IScope<object> = IScope<object>> implements IControlInstance<TParameter>
{
    protected stopWatches: (() => void)[] = [];

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
    protected readonly scope: TScope;
    @inject()
    protected readonly element: HTMLElement;
    @inject()
    protected parameter: Binding<TParameter> | TParameter

    @inject('$injector')
    protected readonly injector: Injector;

    public [afterInjectSymbol]()
    {
        this.init();
    }

    async init(): Promise<void>
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    {
    }

    public [Symbol.dispose]()
    {
        this.stopWatches.forEach(f => f());
    }
}

export interface IControl<T>
{
    priority: number;

    instanciate(scope: IScope<object>, element: Element, parameter: ControlParameter<T>): IControlInstance<T> | PromiseLike<IControlInstance<T>>; // void | Element | PromiseLike<Element | ArrayLike<Element>> | ArrayLike<Element>

}

//eslint-disable-next-line @typescript-eslint/no-unused-vars
export interface IControlInstance<T> extends Disposable
{
    // dispose(): void;

    init?(): void;
}