import { strict as assert } from 'assert';
import { toCamelCase, toKebabCase, toPascalCase, toSnakeCase } from '../case-helpers.js';
import { it } from 'node:test'

it('should format this is_my-input', () =>
{

    const input = 'this is_my-input'

    assert.equal(toCamelCase(input), 'thisIsMyInput');
    assert.equal(toPascalCase(input), 'ThisIsMyInput');
    assert.equal(toKebabCase(input), 'this-is-my-input');
    assert.equal(toSnakeCase(input), 'this_is_my_input');
})

it('should format This_is my-input', () =>
{

    const input2 = 'This_is my-input'

    assert.equal(toCamelCase(input2), 'thisIsMyInput');
    assert.equal(toPascalCase(input2), 'ThisIsMyInput');
    assert.equal(toKebabCase(input2), 'this-is-my-input');
    assert.equal(toSnakeCase(input2), 'this_is_my_input');
})
