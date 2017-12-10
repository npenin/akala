import * as akala from '@akala/core'
import { control, Control } from './control'
import { IScope } from '../scope'

export interface parameter
{
    in: akala.Binding | akala.ObservableArray<any>;
    text: akala.Binding | string;
    textvalue: akala.Binding | string;
    value: akala.Binding | string;
}

@control()
export class Options extends Control<parameter>
{
    constructor()
    {
        super('options', 350)
    }

    public instanciate(target: IScope<any>, element: JQuery, parameter: parameter, controls: any)
    {
        var self = this;
        var value: akala.Binding = controls.value;
        if (controls.value instanceof Function)
            value = controls.value(target, true);

        delete controls.value;
        // var newControls;
        var source: any[] | akala.ObservableArray<any>;
        if (parameter.in instanceof akala.Binding)
            source = parameter.in.getValue();
        else
            source = parameter.in;
        akala.Promisify(source).then(function (source)
        {
            var array: any[];

            if (parameter.text instanceof akala.Binding)
                parameter.text = parameter.text.expression;
            if (parameter.textvalue instanceof akala.Binding)
                parameter.textvalue = parameter.textvalue.expression;
            if (parameter.value instanceof akala.Binding)
                parameter.value = parameter.value.expression;
            if (parameter.text[0] != '$')
                parameter.text = '$item.' + parameter.text;
            if (parameter.value[0] != '$')
                parameter.value = '$item.' + parameter.value;
            if (source instanceof akala.ObservableArray)
            {
                var offset = element.children().length;
                source.on('collectionChanged', function (this: akala.ObservableArray<any>, args: akala.ObservableArrayEventArgs<any>)
                {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action)
                    {
                        case 'init':
                            break;
                        case 'shift':
                            element.children().eq(offset).remove();
                            break;
                        case 'pop':
                            element.children().eq(this.length).remove();
                            break;
                        case 'push':
                            var scope = target.$new();
                            scope['$key'] = this.length - 1;
                            scope['$value'] = args.newItems[0];
                            element.append(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            scope['$key'] = 0;
                            scope['$value'] = args.newItems[0];
                            element.prepend(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            scope['$key'] = this.indexOf(args.newItems[0]);
                            scope['$value'] = args.newItems[0];
                            element.eq(offset + this.indexOf(args.newItems[0])).replaceWith(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
                            break;
                    }
                });
                array = source.array;
            }
            else
                array = source;
            if (typeof (array) == 'undefined')
                throw new Error('invalid array type');

            akala.each(array, function (value, key)
            {
                var scope = target.$new();
                scope['$key'] = key;
                scope['$item'] = value;
                element.append(self.clone($('<option data-bind="{value: ' + (parameter.textvalue || parameter.value) + ', text:' + parameter.text + '}" />'), scope, true));
            })

            element.change(function ()
            {
                var val = element.val();
                var model = akala.grep(array, function (it, i)
                {
                    return val == akala.Parser.eval(<string>(parameter.textvalue || parameter.value), { $item: it, $key: i });
                }, true);
                if (model.length == 0)
                    value.setValue(val, value);
                else
                    value.setValue(model[0], value);
            });
            value.onChanged(function (ev)
            {
                if (value !== ev.source)
                    element.val(akala.Parser.eval(<string>parameter.value, ev.eventArgs.value));
            });
        });
    }
}
