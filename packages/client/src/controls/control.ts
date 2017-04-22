import * as di from '@akala/core';
import { IScope } from '../scope';

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

    public static apply(controls: any, element: JQuery, scope?: any)
    {
        var applicableControls: Control<any>[] = [];
        var requiresNewScope = false;
        Object.keys(controls).forEach(function (key)
        {
            var control: Control<any>;
            applicableControls.push(control = Control.injector.resolve(key));
            if (control.scope)
                requiresNewScope = true;
        });

        applicableControls.sort(function (a, b) { return a.priority - b.priority });

        if (!scope)
            scope = element.data('$scope');
        if (requiresNewScope)
        {
            scope = scope.$new();
            element.data('$scope', scope);
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
        element.find('[data-bind]').each(function ()
        {
            if ($(this).parent().closest('[data-bind]')[0] == element[0])
                $(this).applyTemplate(scope, element);
        });
        return element;
    }

    protected wrap(element: JQuery, scope: IScope<any>, newControls?: any)
    {
        if (newControls)
        {
            var controls: any = di.Parser.parse(element.attr('data-bind'), true);

            var applicableControls: Control<any>[] = [];

            Object.keys(controls).forEach(function (key)
            {
                applicableControls.push(Control.injector.resolve(key));
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

    protected clone(element: JQuery, scope: IScope<any>, newControls?: any)
    {
        var clone = element.clone();
        clone.data('$scope', scope);
        this.wrap(clone, scope, newControls);
        return clone;
    }

    public abstract instanciate(target: any, element: JQuery, parameter: di.Binding | T, controls?: any): void | JQuery | PromiseLike<JQuery>;

    public scope?: any | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public abstract link(scope: IScope<any>, element: JQuery, parameter: di.Binding | T);

    public instanciate(scope: IScope<any>, element: JQuery, parameter: di.Binding | T): void | JQuery
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

    instanciate(scope: IScope<any>, element: JQuery, parameter: any);
}