import * as di from 'akala-core';
import { Scope } from '../scope';


export function control(...toInject: string[])
{
    return function (ctrl: new (...args: any[]) => any)
    {
        Control.injector.init([], di.injectNewWithName(toInject, ctrl));
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
            var newElem = control.instanciate(scope, element, controlSettings);
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

    protected clone(element: JQuery, scope: Scope, newControls?: any)
    {
        var clone = element.clone();
        clone.data('$scope', scope);
        if (newControls)
        {
            var controls: any = di.Parser.parse(clone.attr('data-bind'), true);

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
        Control.apply(newControls, clone, scope);

        return clone;
    }

    public abstract instanciate(target: any, element: JQuery, parameter: di.Binding | T): void | JQuery | PromiseLike<JQuery>;

    public scope?: any | boolean;
}

export abstract class BaseControl<T> extends Control<T>
{
    constructor(name: string, priority?: number)
    {
        super(name, priority);
    }

    public abstract link(target: any, element: JQuery, parameter: di.Binding | T);

    public instanciate(target: any, element: JQuery, parameter: di.Binding | T): void | JQuery
    {
        var self = this;
        di.Promisify(target).then(function (target)
        {
            di.Promisify(parameter).then(function (parameter)
            {
                self.link(target, element, parameter);
            });
        });
    }
}

export interface IControl
{
    priority: number;

    instanciate(scope: Scope, element: JQuery, parameter: any);
}