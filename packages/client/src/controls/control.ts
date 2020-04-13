import * as akala from '@akala/core';
import { IScope } from '../scope';
import { applyTemplate } from '../template';

export function control(...toInject: string[])
{
    return function (ctrl: new (...args: any[]) => any)
    {
        Control.injector.activate([], function ()
        {
            Control.injector.injectNewWithName(toInject, ctrl)();
        });
    }
}

export abstract class Control<T> implements IControl
{
    public static injector: akala.Module = akala.module('controls', 'akala-services');

    constructor(private $$name: string, public priority: number = 500)
    {
        Control.injector.register($$name, this);
    }

    public static apply(controls: any, element: Element, scope?: any)
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

        for (var control of applicableControls)
        {
            var controlSettings = controls[control.$$name];
            if (controlSettings instanceof Function)
                controlSettings = controlSettings(scope, true);
            var newElem = control.instanciate(scope, element, controlSettings, controls);
            if (newElem)
            {
                return newElem;
            }
        };
        akala.each(element.querySelectorAll('[data-bind]'), function (el: HTMLElement)
        {
            if (el.parentElement.closest('[data-bind]') == element)
                applyTemplate([el], scope, element);
        });
        return element;
    }

    protected wrap(element: HTMLElement, scope: IScope<any>, newControls?: any)
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

    protected clone(element: HTMLElement, scope: IScope<any>, newControls?: any)
    {
        var clone = element.cloneNode(true) as HTMLElement;
        clone['$scope'] = scope;
        this.wrap(clone, scope, newControls);
        return clone;
    }

    public abstract instanciate(target: any, element: Element, parameter: akala.Binding | T, controls?: any): void | Element | PromiseLike<Element | ArrayLike<Element>>;

    public scope?: any | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public abstract link(scope: IScope<any>, element: Element, parameter: akala.Binding | T);

    public instanciate(scope: IScope<any>, element: Element, parameter: akala.Binding | T): void | Element
    {
        var self = this;
        akala.Promisify(scope).then(function (scope)
        {
            akala.Promisify(parameter).then(function (parameter)
            {
                self.link(scope, element, parameter);
            });
        });
    }
}

export interface IControl
{
    priority: number;

    instanciate(scope: IScope<any>, element: Element, parameter: any): void | Element | PromiseLike<Element | ArrayLike<Element>> | ArrayLike<Element>;
}