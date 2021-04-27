import * as akala from '@akala/core'
import { control, Control, GenericControlInstance } from './control.js'
import { IScope } from '../scope.js'
import { Template } from '../template.js';

export interface OptionsParameter
{
    in: akala.Binding | akala.ObservableArray<any>;
    text: akala.Binding | string;
    textvalue: akala.Binding | string;
    value: akala.Binding | string;
}

@control('options', 350)
export class Options extends GenericControlInstance<OptionsParameter>
{
    constructor()
    {
        super()
    }

    @akala.inject('controls')
    private controls: any;

    public init()
    {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        let value: akala.Binding = this.controls.value;
        if (this.controls.value instanceof Function)
            value = this.controls.value(this.scope, true);

        delete this.controls.value;
        if (this.parameter instanceof akala.Binding)
            throw new Error('Not Supported');
        const parameter = this.parameter;
        // var newControls;
        const build = (source: any[] | akala.ObservableArray<any>) =>
        {
            let array: any[];
            const element = this.element;
            const target = this.scope;

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
                const offset = this.element.childElementCount;

                source.on('collectionChanged', function (this: akala.ObservableArray<any>, args: akala.ObservableArrayEventArgs<any>) 
                {
                    const key = -1;
                    const isAdded = false;
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
            if (typeof (array) !== 'undefined')
                akala.each(array, (value, key) =>
                {
                    const scope = target.$new();
                    scope['$key'] = key;
                    scope['$item'] = value;
                    self.clone(Template.buildElements('<option data-bind="{value: ' + (parameter.textvalue || parameter.value) + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.appendChild(el));
                })

            this.element.addEventListener('change', () =>
            {
                const val = (element as HTMLSelectElement).value;
                const model = akala.grep(array, (it, i) =>
                {
                    return val == akala.Parser.eval(<string>(parameter.textvalue || parameter.value), { $item: it, $key: i });
                }, true);
                if (model.length == 0)
                    value.setValue(val, value);
                else
                    value.setValue(model[0], value);
            });

            value.onChanged((ev) =>
            {
                if (value !== ev.eventArgs.source && typeof array != 'undefined')
                {
                    const val = akala.Parser.eval(<string>(parameter.textvalue || parameter.value), { $item: ev.eventArgs.value, $key: array.indexOf(ev.eventArgs.value) });
                    this.element.querySelectorAll('option').forEach((opt, i) =>
                    {
                        opt.selected = val == opt.value;
                        if (opt.selected)
                            (element as HTMLSelectElement).selectedIndex = i;
                    });
                }
            });
        }

        if (this.parameter.in instanceof akala.Binding)
            this.parameter.in.onChanged(ev => akala.Promisify(ev.eventArgs.value).then(build));
        else
            akala.Promisify(this.parameter.in).then(build);
    }
}
