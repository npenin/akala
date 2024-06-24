import identity from './identity.js';
import negate from './negate.js';
import booleanize from './booleanize.js';
export * from './date.js';
export * from './call.js';
export * from './common.js'
export { identity, negate, booleanize };
import { module } from '../helpers.js';

module('$formatters').register('#not', negate);
module('$formatters').register('#bool', booleanize);
