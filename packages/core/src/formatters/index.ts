import identity from './identity.js';
import negate from './negate.js';
import booleanize from './booleanize.js';
export * from './date.js';
export * from './common.js'
export { identity, negate, booleanize };
import { Module, module } from '../helpers.js';
import json from './json.js';
import date from './date.js';
import { Formatter } from './common.js';


module('$formatters').register('#not', negate);
module('$formatters').register('#bool', booleanize);
module('$formatters').register('#json', json);
module('$formatters').register('#date', date);

export const formatters: Module & { resolve<T>(formatter: string extends `#${infer X}` ? `#${X} ` : never): (new (...args: unknown[]) => Formatter<T>) } = module('$formatters');
