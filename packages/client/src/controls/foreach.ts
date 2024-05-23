import { Binding, LocalInjector, ObservableArray, Parser, each, inject, parser } from '@akala/core';
import { control, GenericControlInstance } from './control.js'

export interface ForeachParameter
{
    in: parser.ParsedFunction<Binding<unknown[]>> | Binding<unknown[]>;
    key: string;
    value: string;
}

@control('each', 100, { scope: true })
export class ForEach extends GenericControlInstance<ForeachParameter>
{
    constructor(@inject('parameter') parameter: ForeachParameter | string, @inject('$injector') injector: LocalInjector)
    {
        if (typeof (parameter) == 'string')
        {
            parameter = ForEach.parse(parameter);
            injector.register('parameter', parameter, true);
        }
        super();
    }

    public async init()
    {
        if (this.parameter instanceof Binding)
            throw new Error('foreach parameter as a binging is not supported');

        let sourceBinding: Binding<unknown>;
        if (!(this.parameter.in instanceof Binding))
            sourceBinding = this.parameter.in(this.scope);
        else
            sourceBinding = this.parameter.in;

        const element = this.element;
        const parent = this.element.parentElement;
        if (this.element.parentNode)
            this.element.parentNode.removeChild(this.element);
        const parsedParam = this.parameter as ForeachParameter;
        // var newControls;
        const build = (source: ObservableArray<unknown> | unknown[]) =>
        {
            const result: ArrayLike<Element> = [];

            if (source instanceof ObservableArray)
            {
                source.addListener((args) =>
                {
                    switch (args.action)
                    {
                        case 'init':
                            break;
                        case 'shift':
                            for (var i = 0; i < args.oldItems.length; i++)
                                parent.removeChild(parent.firstElementChild);
                            break;
                        case 'pop':
                            for (var i = 0; i < args.oldItems.length; i++)
                                parent.removeChild(parent.lastElementChild);
                            break;
                        case 'push':
                            args.newItems.forEach(arg =>
                            {
                                const scope = this.scope.$new();
                                if (parsedParam.key)
                                    scope[parsedParam.key] = source.length - 1;
                                if (parsedParam.value)
                                    scope[parsedParam.value] = arg;
                                this.clone(element, scope, true).then(el => parent.appendChild(el));
                            })
                            break;
                        case 'unshift':
                            args.newItems.forEach(arg =>
                            {
                                const scope = this.scope.$new();
                                if (parsedParam.key)
                                    scope[parsedParam.key] = 0;
                                if (parsedParam.value)
                                    scope[parsedParam.value] = arg;
                                this.clone(element, scope, true).then(el => parent.insertBefore(el, parent.firstElementChild));
                            });
                            break;
                        case 'replace':
                            var scope = this.scope.$new();
                            if (parsedParam.key)
                                scope[parsedParam.key] = source.indexOf(args.newItems[0]);
                            if (parsedParam.value)
                                scope[parsedParam.value] = args.newItems[0];
                            this.clone(element, scope, true).then(el => parent.replaceChild(el, parent.children[source.indexOf(args.newItems[0])]));
                            break;
                    }
                });
                source = source.array;
            }
            if (source)
                each(source, function (value, key)
                {
                    const scope = this.scope.$new();
                    if (parsedParam.key)
                        scope[parsedParam.key] = key;
                    if (parsedParam.value)
                        scope[parsedParam.value] = value;
                    this.clone(element, scope, true).then(el => parent.appendChild(el));
                });
            return result;
        }

        const stopWatch = sourceBinding.onChanged(function (ev)
        {
            Promise.resolve(ev.value).then(build);
        });
        if (stopWatch)
            this.stopWatches.push(stopWatch);
    }

    private static expRegex = /^\s*\(?(\w+)(?:,\s*(\w+))?\)?\s+in\s+/;

    protected static parse(exp: string): ForeachParameter
    {
        const result = ForEach.expRegex.exec(exp);
        return { in: new parser.EvaluatorAsFunction().eval<Binding<unknown[]>>(new Parser().parse(exp.substring(result[0].length))), key: result[2] && result[1], value: result[2] || result[1] }
    }
}
