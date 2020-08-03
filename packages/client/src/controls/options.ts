import * as akala from '@akala/core'
import { control, Control, GenericControlInstance } from './control'
import { IScope } from '../scope'
import { Template } from '../template';

export interface parameter
{
    in: akala.Binding | akala.ObservableArray<any>;
    text: akala.Binding | string;
    textvalue: akala.Binding | string;
    value: akala.Binding | string;
}

@control('options', 350)
export class Options extends GenericControlInstance<parameter>
{
    constructor()
    {
        super()
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
                            self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.appendChild(el));
                            break;
                        case 'unshift':
                            var scope = target.$new();
                            scope['$key'] = 0;
                            scope['$value'] = args.newItems[0];
                            if (!offset)
                                self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.insertBefore(el, element.firstChild));
                            else
                                self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.insertBefore(el, element.children[offset]));
                            break;
                        case 'replace':
                            var scope = target.$new();
                            scope['$key'] = this.indexOf(args.newItems[0]);
                            scope['$value'] = args.newItems[0];
                            self.clone(Template.buildElements('<option data-bind="{value: ' + parameter.value + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.replaceChild(el, element.children[offset + this.indexOf(args.newItems[0])]));
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
                self.clone(Template.buildElements('<option data-bind="{value: ' + (parameter.textvalue || parameter.value) + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.appendChild(el));
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
