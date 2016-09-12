import {Parser} from './parser';
import {EventEmitter} from 'events';

export class Binding extends EventEmitter
{
    public static eventNameChangingField = "fieldChanging";
    public static eventNameChangedField = "fieldChanged";
    public static eventNameBindingError = "bindingError";

    constructor(private expression: string, private target: any)
    {
        super();
    }

    public getValue()
    {
        var parts = this.expression.split('.');
        var value = this.target;
        for (var i = 0; i < parts.length; i++)
        {
            value = value[parts[i]];
        }
        return value;
    }
    /*apply(elements, doNotRegisterEvents)
    {
        var val = this.getValue();
        var inputs = elements.filter(':input').val(val)
        var binding = this;
        if (!doNotRegisterEvents)
            inputs.change(function ()
            {
                binding.setValue($(this).val(), this);
            });
        elements.filter(':not(:input))').text(val);
    }*/
    private static setValue(target: any, parts: string[], value: any, source: any)
    {
        while (parts.length > 1)
        {
            target = Parser.eval(parts[0], target);
            parts.shift();
        }
        return target;
    }

    public setValue(value, source, doNotTriggerEvents)
    {
        var target = this.target;
        var parts = this.expression.split(".");
        if (parts.length > 1)
        {
            try
            {
                Binding.setValue(target, parts, value, source)
            }
            catch (ex)
            {
                this.emit(Binding.eventNameBindingError, {
                    target: target,
                    field: this.expression,
                    Exception: ex
                });
            }
        }
        try
        {
            var eventArgs = {
                cancel: false,
                fieldName: parts[0],
                source: source
            };
            if (!doNotTriggerEvents) this.emit(Binding.eventNameChangingField, {
                target: target,
                eventArgs: eventArgs
            });
            if (eventArgs.cancel) return;
            target[parts[0]] = value;
            if (!doNotTriggerEvents) this.emit(Binding.eventNameChangedField, {
                target: target,
                eventArgs: {
                    fieldName: parts[0]
                },
                source: source
            });
        }
        catch (ex)
        {
            this.emit(Binding.eventNameBindingError, {
                target: target,
                field: this.expression,
                Exception: ex,
                source: source
            });
        }
    };
}