import { module } from '../helpers.js';
import { FormatterFactory } from '../formatters/common.js';
import { Parser, ParsedString } from '../parser/parser.js';
import { injectWithName } from '../global-injector.js';
import { Binding } from '../binder.js';

export class CallFormatterFactory implements FormatterFactory<unknown, ParsedString>
{
    public parse(expression: string)
    {
        return new ParsedString(expression.substring(0, new Parser().parseFunction(expression).$$length));
    }
    public build(settings: ParsedString)
    {
        function evaluate(x)
        {
            if (this.args && x && x[this.method])
            {
                return x[this.method](...Binding.unbindify<unknown[]>(this.args));
            }
        }

        if (settings.value.startsWith('$formatters.'))
            return module('$formatters').injectWithName([settings.value.substring('$formatters.'.length)], evaluate)
        else
            return injectWithName([settings.value], evaluate);
    }
}

module('$formatters').register('#call', new CallFormatterFactory());
