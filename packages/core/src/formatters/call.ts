import { extend, module } from "../helpers";
import { FormatterFactory } from "../formatters/common";
import { Parser, ParsedFunction, ParsedBinary, ParsedString } from "../parser";
import { resolve, injectWithName } from "../injector";
import { Binding } from "../binder";
import { map } from "../each";

export class CallFormatterFactory implements FormatterFactory<any, ParsedString>
{
    constructor() { }
    public parse(expression: string)
    {
        return new ParsedString(expression.substring(0, Parser.parseFunction(expression).$$length));
    }
    public build(formatter, settings: ParsedString)
    {
        function evaluate(x)
        {
            if (this.args && x && x[this.method])
            {
                return x[this.method].apply(null, Binding.unbindify(this.args));
            }
        }

        if (settings.value.startsWith('$formatters.'))
            return module('$formatters').injectWithName([settings.value.substring('$formatters.'.length)], evaluate)
        else
            return injectWithName([settings.value], evaluate);
    }
}

module('$formatters').register('#call', new CallFormatterFactory());
