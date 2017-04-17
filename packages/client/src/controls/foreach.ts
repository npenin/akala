import * as di from '@akala/core'
import { control, Control } from './control'
import { Scope } from '../scope'

@control()
export class ForEach extends Control<any>
{
    constructor()
    {
        super('each', 100)
    }

    public instanciate(target: Scope, element: JQuery, parameter: any)
    {
        if (typeof (parameter) == 'string')
        {
            parameter = this.parse(parameter);
        }

        var source = di.Parser.eval(parameter.in, target);
        var self = this;
        var parent = element.parent();
        element.detach();
        // var newControls;
        return di.Promisify(source).then(function (source)
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
                            if (parameter.key)
                                scope[parameter.key] = source.length - 1;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.append(self.clone(element, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = 0;
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.prepend(self.clone(element, scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            if (parameter.key)
                                scope[parameter.key] = source.indexOf(args.newItems[0]);
                            if (parameter.value)
                                scope[parameter.value] = args.newItems[0];
                            parent.eq(source.indexOf(args.newItems[0])).replaceWith(self.clone(element, scope, true));
                            break;
                    }
                });
                source = source.array;
            }
            $.each(source, function (key, value)
            {
                var scope = target.$new();
                if (parameter.key)
                    scope[parameter.key] = key;
                if (parameter.value)
                    scope[parameter.value] = value;
                parent.append(self.clone(element, scope, true));
            });
            return result;
        });
    }

    private static expRegex = /^\s*\(?(\w+)(?:, (\w+))?\)?\s+in\s+(\w+)\s*/;

    private parse(exp: string)
    {
        var result = ForEach.expRegex.exec(exp).slice(1);
        return { in: result[2], key: result[1] && result[0], value: result[1] || result[0] }
    }
}
