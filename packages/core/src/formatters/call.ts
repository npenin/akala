import { extend, module } from "../helpers";
import { FormatterFactory } from "../formatters/common";
import { Parser, ParsedFunction, ParsedBinary, ParsedString } from "../parser";
import { resolve, injectWithName } from "../injector";

export class CallFormatterFactory implements FormatterFactory<any, ParsedString>
{
    constructor() { }
    public parse(expression: string)
    {
        return new ParsedString(expression.substring(0, Parser.parseFunction(expression).$$length));
    }
    public build(formatter, settings: ParsedString)
    {
        if (settings.value.startsWith('$formatters.'))
            return module('$formatters').injectWithName([settings.value.substring('$formatters.'.length)], function (x)
            {
                if (this.args && x && x[this.method])
                    x[this.method].apply(null, this.args);
            })
        else
            return injectWithName([settings.value], function (x)
            {
                if (this.args && x && x[this.method])
                    x[this.method].apply(null, this.args);
            });
    }
}

module('$formatters').register('#call', new CallFormatterFactory());
