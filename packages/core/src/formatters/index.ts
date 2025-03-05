import identity from './identity.js';
import negate from './negate.js';
import booleanize from './booleanize.js';
export * from './date.js';
export * from './common.js'
export { identity, negate, booleanize };
import { Module, module } from '../helpers.js';
import json from './json.js';
import date from './date.js';
import { FormatterFactory, ReversibleFormatter, ReversibleFormatterFactory } from './common.js';
import { Debounce } from './debounce.js';

export function reverseFormatter<TResult, TOrigin, TSettings extends unknown[]>(formatter: ReversibleFormatterFactory<TResult, TOrigin, TSettings>): ReversibleFormatterFactory<TOrigin, TResult, TSettings>
{
    return class Reversed implements ReversibleFormatter<TOrigin, TResult>
    {
        private readonly inner: ReversibleFormatter<TResult, TOrigin>
        constructor(...settings: TSettings)
        {
            this.inner = new formatter(...settings);
        }

        format(value: TResult): TOrigin
        {
            return this.inner.unformat(value);
        }

        unformat(value: TOrigin): TResult
        {
            return this.inner.format(value);
        }
    }
}

module('$formatters').register('#not', negate);
module('$formatters').register('#bool', booleanize);
module('$formatters').register('#json', json);
module('$formatters').register('#date', date);
module('$formatters').register('#toDate', reverseFormatter(date));
module('$formatters').register('#debounce', Debounce);

export const formatters: Module & { resolve<T>(formatter: string extends `#${infer X}` ? `#${X} ` : never): FormatterFactory<T> } = module('$formatters');

