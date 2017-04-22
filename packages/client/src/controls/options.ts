import * as di from '@akala/core'
import { control, Control } from './control'
import { IScope } from '../scope'

export interface parameter
{
    in: di.Binding | di.ObservableArray<any>;
    text: di.Binding | string;
    value: di.Binding | string;
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
        var value: di.Binding = controls.value;
        if (controls.value instanceof Function)
            value = controls.value(target, true);

        delete controls.value;
        // var newControls;
        di.Promisify(parameter.in).then(function (source)
        {
            var array: any[];
            if (source instanceof di.Binding)
                array = source = source.getValue();

            if (parameter.text instanceof di.Binding)
                parameter.text = parameter.text.expression;
            if (parameter.value instanceof di.Binding)
                parameter.value = parameter.value.expression;
            if (parameter.text[0] != '$')
                parameter.text = '$item.' + parameter.text;
            if (parameter.value[0] != '$')
                parameter.value = '$item.' + parameter.value;
            if (source instanceof di.ObservableArray)
            {
                var offset = element.children().length;
                source.on('collectionChanged', function (this: di.ObservableArray<any>, args: di.ObservableArrayEventArgs<any>)
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
            if (typeof (array) == 'undefined')
                throw new Error('invalid array type');

            $.each(array, function (key, value)
            {
                var scope = target.$new();
                scope['$key'] = key;
                scope['$item'] = value;
                element.append(self.clone($('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />'), scope, true));
            });

            element.change(function ()
            {
                var val = element.val();
                var model = $.grep(array, function (it, i)
                {
                    return val == di.Parser.eval(<string>parameter.value, { $item: it, $key: i });
                });
                if (model.length == 0)
                    value.setValue(val, value);
                else
                    value.setValue(model[0], value);
            });
            value.onChanged(function (ev)
            {
                if (value !== ev.source)
                    element.val(di.Parser.eval(<string>parameter.value, ev.eventArgs.value));
            });
        });
    }
}
