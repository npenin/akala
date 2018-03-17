import * as di from '@akala/core'
import { control, Control } from './control'
import { IScope } from '../scope'

export interface ForeachParameter
{
    in: di.ParsedFunction;
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

    public instanciate(target: IScope<any>, element: JQuery, parameter: ForeachParameter | string)
    {
        if (typeof (parameter) == 'string')
            parameter = this.parse(parameter);

        var parsedParam: ForeachParameter = parameter;

        if (parameter.in instanceof Function)
            var sourceBinding = parameter.in(target, true);

        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        function build(source: di.ObservableArray<any> | any[])
        {
            var result = $();

            if (source instanceof di.ObservableArray)
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
                            parent.eq(0).remove();
                            break;
                        case 'pop':
                            parent.eq(source.length).remove();
                            break;
                        case 'push':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.length - 1;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = 0;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            akala.each(source, function (key, value)
            {
                var scope = target.$new();
                if (parsedParam.key)
                    scope[parsedParam.key] = key;
                if (parsedParam.value)
                    scope[parsedParam.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        }

        sourceBinding.onChanged(function (ev)
        {
            di.Promisify(ev.eventArgs.value).then(build);
        }, true);
        return di.Promisify(sourceBinding.getValue()).then(build);
    }

    private static expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;

    protected parse(exp: string): ForeachParameter
    {
        var result = ForEach.expRegex.exec(exp);
        return { in: di.Parser.evalAsFunction(exp.substring(result[0].length)), key: result[2] && result[1], value: result[2] || result[1] }
    }
}
