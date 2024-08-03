import identity from './identity.js';
import negate from './negate.js';
import booleanize from './booleanize.js';
export * from './date.js';
export * from './call.js';
export * from './common.js'
export { identity, negate, booleanize };
import { module } from '../helpers.js';
import json from './json.js';
import date from './date.js';


module('$formatters').register('#not', negate);
module('$formatters').register('#bool', booleanize);
module('$formatters').register('#json', json);
module('$formatters').register('#date', date);

export const formatters = module('$formatters');
