import assert from 'assert';
import specExamples from './uritemplate-test/spec-examples.json' with {type: 'json'}
import extendedCases from './uritemplate-test/extended-tests.json' with {type: 'json'}
import negativeCases from './uritemplate-test/negative-tests.json' with {type: 'json'}
import { parse, expand, tryParse, match } from '../uri-template/index.js';
import { each } from '../each.js';
import { describe, it } from 'node:test'

describe('uri-template-expansion', () =>
{
    for (const e of Object.entries(specExamples))
        for (const tc of e[1].testcases)
            it(`works with ${e[0]} (${tc[0]})`, async () =>
            {
                const actual = expand(parse(tc[0] as string), e[1].variables)
                if (typeof tc[1] == 'string')
                    assert.strictEqual(actual, tc[1]);
                else
                {
                    if (!tc[1].includes(actual))
                        assert.strictEqual(actual, tc[1]);
                }
            });
    for (const e of Object.entries(extendedCases))
        for (const tc of e[1].testcases)
            it(`works with ${e[0]} (${tc[0]})`, async () =>
            {
                const actual = expand(parse(tc[0] as string), e[1].variables)
                if (typeof tc[1] == 'string')
                    assert.strictEqual(actual, tc[1]);
                else
                {
                    if (!tc[1].includes(actual))
                        assert.strictEqual(actual, tc[1]);
                }
            });

    for (const e of Object.entries(negativeCases))
        for (const tc of e[1].testcases)
            it(`works with ${e[0]} (${tc[0]})`, () =>
            {
                const parsed = tryParse(tc[0] as string)

                function throws(f: () => void)
                {
                    try
                    {
                        f();
                        return false;
                    }
                    catch (e)
                    {
                        return true;
                    }
                }

                if (tc[1] == false)
                    assert.ok(parsed.warnings.length > 0 || throws(() => expand(parsed.template, e[1].variables)));
            });
});

describe('uri-template-matching', () =>
{
    for (const e of Object.entries(specExamples))
        for (const tc of e[1].testcases.filter(tc => tc[0] !== '{+keys}' && tc[0] !== '{+keys*}' && tc[0] !== '{#keys}' && tc[0] !== '{#keys*}' && tc[0] !== 'X{.list}' && tc[0] !== '{/list*,path:4}'))
            it(`works with ${e[0]} (${tc[0]})`, async () =>
            {
                const template = parse(tc[0] as string);
                const variables = template.flatMap(t => typeof (t) == 'string' ? null : Array.isArray(t.ref) ? t.ref.flatMap(t => typeof (t) == 'string' ? null : t.ref as string) : t.ref).filter(x => x)
                if (typeof tc[1] == 'string')
                {
                    const actual = match(tc[1], template)
                    assert.notStrictEqual(actual, null);
                    assert.strictEqual(actual.remainder, '');
                    each(variables, (name) =>
                    {
                        assert.ok(name in actual.variables);
                        if (tc[0].indexOf(name + ':') == -1)
                        {
                            assert.strictEqual(typeof actual.variables[name], typeof e[1].variables[name]);
                            if (typeof actual.variables[name] == 'string')
                                assert.strictEqual(actual.variables[name], e[1].variables[name]);
                            else
                                each(e[1].variables[name], (value, key) => assert.strictEqual(actual.variables[name][key], value));
                        }
                        else
                            assert.ok(e[1].variables[name].startsWith(actual.variables[name]));
                    })
                }
                else
                {
                    tc[1].forEach(expected =>
                    {
                        const actual = match(expected, template)
                        assert.notStrictEqual(actual, null);
                        assert.strictEqual(actual.remainder, '');
                        each(variables, (name) =>
                        {
                            assert.ok(name in actual.variables);
                            if (tc[0].indexOf(name + ':') == -1)
                            {
                                assert.strictEqual(typeof actual.variables[name], typeof e[1].variables[name]);
                                if (typeof actual.variables[name] == 'string')
                                    assert.strictEqual(actual.variables[name], e[1].variables[name]);
                                else if (Array.isArray(e[1].variables[name]))
                                    e[1].variables[name].forEach((value, key) => assert.strictEqual(actual.variables[name][key], value));
                                else if (Array.isArray(actual.variables[name]))
                                    (actual.variables[name] as string[]).forEach((actual, i, values) =>
                                    {
                                        if (i % 2 == 0)
                                            assert.ok(actual in e[1].variables[name])
                                        else
                                            assert.strictEqual(actual, e[1].variables[name][values[i - 1]])
                                    })
                                else
                                    each(e[1].variables[name], (value, key) =>
                                    {
                                        assert.strictEqual(actual.variables[name][key], value)
                                    })
                            }
                            else
                                assert.ok(e[1].variables[name].startsWith(actual.variables[name]));
                        })
                    })
                }
            });
});
