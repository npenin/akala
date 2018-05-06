import * as akala from '@akala/core'
import { control, Control } from './control'
import { IScope } from '../scope'

export interface ForeachParameter
{
    in: akala.ParsedFunction;
    key: string;
    value: string;
}

@control()
export class ForEach extends Control<ForeachParameter | string>
{
    constructor(name?: string)
    {
        super(name || 'each', 100)
    }

    public instanciate(target: IScope<any>, element: HTMLElement, parameter: ForeachParameter | string)
    {
        if (typeof (parameter) == 'string')
            parameter = this.parse(parameter);

        var parsedParam: ForeachParameter = parameter;

        if (parameter.in instanceof Function)
            var sourceBinding = parameter.in(target, true);

        var self = this;
        var parent = element.parentElement;
        element.parentNode.removeChild(element);
        // var newControls;
        function build(source: akala.ObservableArray<any> | any[])
        {
            var result: ArrayLike<Element> = [];

            if (source instanceof akala.ObservableArray)
            {
                source.on('collectionChanged', function (args)
                {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action)
                    {
                        case 'init':
                            break;
                        case 'shift':
                            parent.removeChild(parent.firstElementChild);
                            break;
                        case 'pop':
                            parent.removeChild(parent.lastElementChild);
                            break;
                        case 'push':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.length - 1;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.appendChild(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = 0;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.insertBefore(self.clone(element, scope, true), parent.firstElementChild);
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.replaceChild(self.clone(element, scope, true), parent.children[source.indexOf(args.newItems[0])]);
                            break;
                    }
                });
                source = source.array;
            }
            akala.each(source, function (value, key)
            {
                var scope = target.$new();
                if (parsedParam.key)
                    scope[parsedParam.key] = key;
                if (parsedParam.value)
                    scope[parsedParam.value] = value;
                parent.appendChild(self.clone(element, scope, true));
            });
            return result;
        }

        sourceBinding.onChanged(function (ev)
        {
            Promise.resolve(ev.eventArgs.value).then(build);
        }, true);
        return Promise.resolve(sourceBinding.getValue()).then(build);
    }

    private static expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;

    protected parse(exp: string): ForeachParameter
    {
        var result = ForEach.expRegex.exec(exp);
        return { in: akala.Parser.evalAsFunction(exp.substring(result[0].length)), key: result[2] && result[1], value: result[2] || result[1] }
    }
}
