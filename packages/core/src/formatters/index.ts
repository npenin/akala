import identity from './identity.js';
import negate from './negate.js';
import booleanize from './booleanize.js';
export * from './date.js';
export * from './common.js'
export { identity, negate, booleanize };
import { Module } from '../module.js';
import json from './json.js';
import date from './date.js';
import type { FormatterFactory, ReversibleFormatter, ReversibleFormatterFactory } from './common.js';
import { Debounce } from './debounce.js';
import Slice from './slice.js';

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

export const formatters: Module & { resolve<T>(formatter: string extends `#${infer X}` ? `#${X} ` : never): FormatterFactory<T> } = new Module('$formatters');

formatters.register('#not', negate);
formatters.register('#bool', booleanize);
formatters.register('#json', json);
formatters.register('#date', date);
formatters.register('#toDate', reverseFormatter(date));
formatters.register('#debounce', Debounce);
formatters.register('#slice', Slice);
