import { strict as assert } from 'assert';
import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../case-helpers.js';

const input = 'this is_my-input'

assert.equal(toCamelCase(input), 'thisIsMyInput');
assert.equal(toPascalCase(input), 'ThisIsMyInput');
assert.equal(toKebabCase(input), 'this-is-my-input');
assert.equal(toSnakeCase(input), 'this_is_my_input');

const input2 = 'This_is my-input'

assert.equal(toCamelCase(input2), 'thisIsMyInput');
assert.equal(toPascalCase(input2), 'ThisIsMyInput');
assert.equal(toKebabCase(input2), 'this-is-my-input');
assert.equal(toSnakeCase(input2), 'this_is_my_input');