import * as di from '@akala/core';
import { IScope } from '../scope';
import { each, applyTemplate } from '../template';

var registeredControls: { 0: string[], 1: new (...args: any[]) => any }[] = [];

export function control(...toInject: string[])
{
    return function (ctrl: new (...args: any[]) => any)
    {
        if (registeredControls.length == 0)
            Control.injector.init([], function ()
            {
                registeredControls.forEach(function (ctrl)
                {
                    di.injectNewWithName(ctrl[0], ctrl[1])();
                });
            });
        registeredControls.push([toInject, ctrl]);
    }
}

export abstract class Control<T> implements IControl
{
    public static injector: di.Module = di.module('controls', 'akala-services');

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
        each(element.querySelectorAll('[data-bind]'), function (el)
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
            var controls: any = di.Parser.parse(element.dataset['data-bind'], true);

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
        var clone = element.cloneNode() as HTMLElement;
        clone['$scope'] = scope;
        this.wrap(clone, scope, newControls);
        return clone;
    }

    public abstract instanciate(target: any, element: Element, parameter: di.Binding | T, controls?: any): void | Element | PromiseLike<Element | ArrayLike<Element>>;

    public scope?: any | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public abstract link(scope: IScope<any>, element: Element, parameter: di.Binding | T);

    public instanciate(scope: IScope<any>, element: Element, parameter: di.Binding | T): void | Element
    {
        var self = this;
        di.Promisify(scope).then(function (scope)
        {
            di.Promisify(parameter).then(function (parameter)
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