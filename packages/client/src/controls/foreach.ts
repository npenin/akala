import * as akala from '@akala/core'
import { control, GenericControlInstance } from './control'

export interface ForeachParameter
{
    in: akala.ParsedFunction | akala.Binding;
    key: string;
    value: string;
}

@control('each', 100, { scope: true })
export class ForEach extends GenericControlInstance<ForeachParameter>
{
    constructor(@akala.inject('parameter') parameter: ForeachParameter | string, @akala.inject('$injector') injector: akala.Injector)
    {
        if (typeof (parameter) == 'string')
        {
            parameter = ForEach.parse(parameter);
            injector.register('parameter', parameter, true);
        }
        super();
    }

    public init()
    {
        if (this.parameter instanceof akala.Binding)
            throw new Error('foreach parameter as a binging is not supported');

        var sourceBinding: akala.Binding;
        if (this.parameter.in instanceof Function)
            sourceBinding = this.parameter.in(this.scope, true);
        else
            sourceBinding = this.parameter.in;

        var self = this;
        var element = this.element;
        var parent = this.element.parentElement;
        if (this.element.parentNode)
            this.element.parentNode.removeChild(this.element);
        var parsedParam = self.parameter as ForeachParameter;
        // var newControls;
        function build(source: akala.ObservableArray<any> | any[])
        {
            var result: ArrayLike<Element> = [];

            if (source instanceof akala.ObservableArray)
            {
                source.on('collectionChanged', function (args)
                {
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
                            var scope = self.scope.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.length - 1;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            self.clone(element, scope, true).then(el => parent.appendChild(el));
                            break;
                        case 'unshift':
                            var scope = self.scope.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = 0;
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            self.clone(element, scope, true).then(el => parent.insertBefore(el, parent.firstElementChild));
                            break;
                        case 'replace':
                            var scope = self.scope.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            self.clone(element, scope, true).then(el => parent.replaceChild(el, parent.children[source.indexOf(args.newItems[0])]));
                            break;
                    }
                });
                source = source.array;
            }
            if (source)
                akala.each(source, function (value, key)
                {
                    var scope = self.scope.$new();
                    if (parsedParam.key)
                        scope[parsedParam.key] = key;
                    if (parsedParam.value)
                        scope[parsedParam.value] = value;
                    self.clone(element, scope, true).then(el => parent.appendChild(el));
                });
            return result;
        }

        this.stopWatches.push(sourceBinding.onChanged(function (ev)
        {
            Promise.resolve(ev.eventArgs.value).then(build);
        }));
    }

    private static expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;

    protected static parse(exp: string): ForeachParameter
    {
        var result = ForEach.expRegex.exec(exp);
        return { in: akala.Parser.evalAsFunction(exp.substring(result[0].length)), key: result[2] && result[1], value: result[2] || result[1] }
    }
}
