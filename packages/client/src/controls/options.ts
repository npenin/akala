import * as akala from '@akala/core'
import { control, Control } from './control'
import { IScope } from '../scope'
import { Template } from '../template';

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

    public instanciate(target: IScope<any>, element: HTMLSelectElement, parameter: parameter, controls: any)
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
                var offset = element.childElementCount;
                source.on('collectionChanged', function (this: akala.ObservableArray<any>, args: akala.ObservableArrayEventArgs<any>)
                {
                    var key = -1;
                    var isAdded = false;
                    switch (args.action)
                    {
                        case 'init':
                            break;
                        case 'shift':
                            if (!offset)
                                element.removeChild(element.firstElementChild);
                            else
                                element.removeChild(element.children[0]);
                            break;
                        case 'pop':
                            element.removeChild(element.lastElementChild)
                            break;
                        case 'push':
                            var scope = target.$new();
                            scope['$key'] = this.length - 1;
                            scope['$value'] = args.newItems[0];
                            element.appendChild(self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            scope['$key'] = 0;
                            scope['$value'] = args.newItems[0];
                            if (!offset)
                                element.insertBefore(self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true), element.firstChild);
                            else
                                element.insertBefore(self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true), element.children[offset]);
                            break;
                        case 'replace':
                            var scope = target.$new();
                            scope['$key'] = this.indexOf(args.newItems[0]);
                            scope['$value'] = args.newItems[0];
                            element.replaceChild(self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true), element.children[offset + this.indexOf(args.newItems[0])]);
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
                element.appendChild(self.clone(Template.buildElements('<option data-bind="{value: ' + (parameter.textvalue || parameter.value) + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true));
            })

            element.addEventListener('change', function ()
            {
                var val = element.value;
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
                {
                    var val = akala.Parser.eval(<string>(parameter.textvalue || parameter.value), { $item: ev.eventArgs.value, $key: array.indexOf(ev.eventArgs.value) });
                    element.querySelectorAll('option').forEach(function (opt, i)
                    {
                        opt.selected = val == opt.value;
                        if (opt.selected)
                            element.selectedIndex = i;
                    });
                }
            });
        });
    }
}
