import { control, ControlParameter, GenericControlInstance } from './control.js'
import { Template } from '../template.js';
import { Binding, each, ExpressionsWithLength, grep, inject, ObservableArray, ObservableArrayEventArgs, parser } from '@akala/core';
import { Expressions } from '@akala/core/expressions';

export interface OptionsParameter
{
    in: Binding<unknown[]> | ObservableArray<unknown>;
    text: Binding<unknown> | Expressions;
    textvalue: Binding<unknown> | Expressions;
    value: Binding<unknown> | Expressions;
}

@control('options', 350)
export class Options extends GenericControlInstance<OptionsParameter>
{
    constructor()
    {
        super()
    }

    @inject('controls')
    private controls: { value: ControlParameter<unknown> };

    public async init()
    {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        let value = this.controls.value as Binding<unknown>;
        if (typeof this.controls.value == 'function')
            value = this.controls.value(this.scope, true);

        delete this.controls.value;
        if (this.parameter instanceof Binding)
            throw new Error('Not Supported');
        const parameter = this.parameter;
        // var newControls;
        const build = (source: unknown[] | ObservableArray<unknown>) =>
        {
            let array: unknown[];
            const element = this.element;
            const target = this.scope;

            if (parameter.text instanceof Binding)
                parameter.text = parameter.text.expression;
            if (parameter.textvalue instanceof Binding)
                parameter.textvalue = parameter.textvalue.expression;
            if (parameter.value instanceof Binding)
                parameter.value = parameter.value.expression;
            // if (parameter.text[0] != '$')
            //     parameter.text =  '$item.' + parameter.text;
            // if (parameter.value[0] != '$')
            //     parameter.value = '$item.' + parameter.value;
            if (source instanceof ObservableArray)
            {
                const offset = this.element.childElementCount;

                source.addListener(function (this: ObservableArray<unknown>, args: ObservableArrayEventArgs<unknown>) 
                {
                    // const key = -1;
                    // const isAdded = false;
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
                each(array, (value, key) =>
                {
                    const scope = target.$new();
                    scope['$key'] = key;
                    scope['$item'] = value;
                    self.clone(Template.buildElements('<option data-bind="{value: ' + (parameter.textvalue || parameter.value) + ', text:' + parameter.text + '}" />')[0] as HTMLElement, scope, true).then(el => element.appendChild(el));
                })

            this.element.addEventListener('change', () =>
            {
                const val = (element as HTMLSelectElement).value;
                const model = grep(array, (it, i) =>
                {
                    return val == (new parser.EvaluatorAsFunction().eval((parameter.textvalue || parameter.value) as ExpressionsWithLength))({ $item: it, $key: i });
                }, true);
                if (model.length == 0)
                    value.setValue(val)//, value);
                else
                    value.setValue(model[0])//, value);
            });

            value.onChanged(ev =>
            {
                // if (value !== ev.eventArgs.source && typeof array != 'undefined')
                if (typeof array != 'undefined')
                {
                    const val = (new parser.EvaluatorAsFunction().eval((parameter.textvalue || parameter.value) as ExpressionsWithLength))({ $item: ev.value, $key: array.indexOf(ev.value) });
                    this.element.querySelectorAll('option').forEach((opt, i) =>
                    {
                        opt.selected = val == opt.value;
                        if (opt.selected)
                            (element as HTMLSelectElement).selectedIndex = i;
                    });
                }
            });
        }

        if (this.parameter.in instanceof Binding)
            this.parameter.in.onChanged(ev => Promise.resolve(ev.value).then(build));
        else
            Promise.resolve(this.parameter.in).then(build);
    }
}
