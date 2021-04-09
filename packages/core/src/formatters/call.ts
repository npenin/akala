import { module } from "../helpers";
import { FormatterFactory } from "../formatters/common";
import { Parser, ParsedString } from "../parser";
import { injectWithName } from "../global-injector";
import { Binding } from "../binder";

export class CallFormatterFactory implements FormatterFactory<any, ParsedString>
{
    public parse(expression: string)
    {
        return new ParsedString(expression.substring(0, new Parser().parseFunction(expression).$$length));
    }
    public build(formatter, settings: ParsedString)
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
