import { Parser, ParsedString, StringCursor, ParsedNumber, ParsedBoolean } from '../parser/parser.js';
import { BinaryOperator } from '../parser/expressions/binary-operator.js';
import { type Formatter, formatters } from '../formatters/index.js';
import { EvaluatorAsFunction } from '../parser/evaluator-as-function.js';
import { ObservableArray } from '../observables/array.js';
import { it, describe } from 'node:test'
import assert from 'assert/strict'
import { delay } from '../promiseHelpers.js';
import { BinaryExpression } from '../parser/expressions/binary-expression.js';
import type { Expressions } from '../parser/expressions/index.js';

//b*(c+d) ==> (b*c)+d

const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
describe('parser tests', () =>
{
    [['b*c+d', 10] as const, ['b*(c+d)', 14] as const, ['b*(c+d)+1', 15] as const, ['(b*c+d)+1', 11] as const].forEach(([operation, expectedResult]) =>
        it('should do math ' + operation, () =>
        {
            const cursor = new StringCursor(operation);
            const result = parser.parseAny(cursor, false);
            console.log(result.toString());
            assert.strictEqual(operation.length, cursor.offset);
            assert.strictEqual((evaluator.eval(result))({ b: 2, c: 3, d: 4 }), expectedResult);
        })
    );

    it('should apply precedence', () =>
    {

        const test = new BinaryExpression<Expressions>(new ParsedString('b'), BinaryOperator.Times, new BinaryExpression(new ParsedString('c'), BinaryOperator.Plus, new ParsedString('d')));
        BinaryExpression.applyPrecedence(test);

        assert.strictEqual(test.toString(), '( b * ( c + d ) )');
    })

    it('should parse complex expressions', () =>
    {
        assert.strictEqual((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ template: '/devices/virtualstate.html' }), '/devices/virtualstate.html');
        assert.strictEqual((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ deviceType: 'pioneer' }), '/pioneer/new.html');
    })

    class DummyHttpFormatter implements Formatter<string>
    {
        public format(value: unknown)
        {
            return `$http on '${value}'`;
        }
    }
    formatters.register('#http', DummyHttpFormatter, true);

    it('should return number', () =>
    {

        assert.strictEqual((evaluator.eval(parser.parse("2000")))(), 2000);
    });

    it('should format', () =>
    {
        const formatter = new DummyHttpFormatter();
        assert.strictEqual((evaluator.eval(parser.parse("'/my/url' # http")))(), formatter.format('/my/url'));
        assert.strictEqual((evaluator.eval(parser.parse("'2018-03-12' # toDate")))({}).valueOf(), new Date(Date.UTC(2018, 2, 12, 0, 0, 0, 0)).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'12/03/18' #toDate:'dd/MM/yy'")))({}).valueOf(), new Date(Date.UTC(2018, 2, 12)).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'03/12/18' #toDate:'MM/dd/yy'")))({}).valueOf(), new Date(Date.UTC(2018, 2, 12)).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'3/12/18' #toDate:'MM/dd/yy'")))({}).valueOf(), new Date(Date.UTC(2018, 2, 12)).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'2018-03-12' #toDate #date:'dd'")))({}), '12');
        assert.deepStrictEqual((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}"))({})), { options: { in: formatter.format('/api/@domojs/zigate/pending'), text: undefined, value: undefined } });
        assert.deepStrictEqual((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}")))({})['options'], { in: formatter.format('/api/@domojs/zigate/pending'), text: undefined, value: undefined });
    })

    it('evals', async () =>
    {

        console.log(evaluator.eval(parser.parse('columns[0].title'))({ columns: [{ title: 'pwet' }] }))

        const args = {
            controller: {
                async fakeServer(sort, page)
                {
                    const result = await Promise.resolve(['x', 'y', 'z']);
                    return result.map(x => x + sort + page)
                }
            }, table: { sort: 'a', page: 1 }
        };
        await delay(10)
        const array = evaluator.eval<ObservableArray<string>>(parser.parse('controller.fakeServer(table.sort, table.page)#asyncArray'))(args);
        array.addListener(ev => console.log(array.array));
    })


    describe('StringCursor', () =>
    {
        it('advances offset and freezes', () =>
        {
            const cursor = new StringCursor('abc');
            assert.strictEqual(cursor.char, 'a');
            cursor.offset = 1;
            assert.strictEqual(cursor.char, 'b');
            const frozen = cursor.freeze();
            assert.strictEqual(frozen.offset, 1);
        });

        it('throws when offset beyond string', () =>
        {
            const cursor = new StringCursor('a');
            assert.throws(() => { cursor.offset = 5 }, e => (e as Error).message === 'Cursor cannot go beyond the string limit');
        });

        it('exec matches and advances offset', () =>
        {
            const cursor = new StringCursor('123abc');
            const match = cursor.exec(/\d+/);
            assert.strictEqual(match?.[0], '123');
            assert.strictEqual(cursor.offset, 3);
        });

        it('exec returns null if not at offset', () =>
        {
            const cursor = new StringCursor('abc');
            cursor.offset = 1;
            const result = cursor.exec(/abc/);
            assert.strictEqual(result, null);
        });
    });

    describe('Parser basics', () =>
    {
        const parser = new Parser();

        it('parses numbers', () =>
        {
            const expr = parser.parse('123');
            assert.ok(expr instanceof ParsedNumber);
        });

        it('throws on invalid number', () =>
        {
            assert.throws(() => parser.parse('.x'));
        });

        it('parses booleans', () =>
        {
            assert.ok(parser.parse('true') instanceof ParsedBoolean);
            assert.ok(parser.parse('false') instanceof ParsedBoolean);
        });

        it('parses strings', () =>
        {
            assert.ok(parser.parse('"hello"') instanceof ParsedString);
            assert.ok(parser.parse("'hi'") instanceof ParsedString);
        });

        it('throws on invalid string', () =>
        {
            assert.throws(() => parser.parse('"unclosed'));
        });

        it('parses arrays', () =>
        {
            const expr = parser.parse('[1,2]');
            assert.ok(expr.type);
        });

        it('parses objects', () =>
        {
            const expr = parser.parse('{ "a": 1, b: 2 }');
            assert.ok(expr.type);
        });

        it('parses ternary', () =>
        {
            const expr = parser.parse('true ? 1 : 2');
            assert.ok(expr.type);
        });

        it('throws on invalid ternary', () =>
        {
            assert.throws(() => parser.parse('true ? 1'));
        });

        it('parses function calls', () =>
        {
            assert.strictEqual(3, evaluator.eval(parser.parse('foo(1,2)'))({ foo(a: number, b: number) { return a + b; } }));
            assert.strictEqual(undefined, evaluator.eval(parser.parse('foo?.(1,2)'))({}));
        });

        it('parses member access', () =>
        {
            assert.ok(parser.parse('foo.bar'));
            assert.ok(parser.parse('foo?.bar'));
        });

        it('parses formatter expression', () =>
        {
            // fake formatter
            const expr = parser.parse('1 #identity');
            assert.ok(expr.type);
        });

        it('throws on invalid operator', () =>
        {
            assert.throws(() => parser.parse('1 @@ 2'))
        });
    });

    describe('Parser.operate', () =>
    {
        it('evaluates binary operators correctly', () =>
        {
            assert.strictEqual(Parser.operate(BinaryOperator.Plus, 1, 2), 3);
            assert.strictEqual(Parser.operate(BinaryOperator.Minus, 3, 1), 2);
            assert.strictEqual(Parser.operate(BinaryOperator.Div, 6, 2), 3);
            assert.strictEqual(Parser.operate(BinaryOperator.Times, 2, 3), 6);
            assert.strictEqual(Parser.operate(BinaryOperator.Equal, 1, '1'), true);
            assert.strictEqual(Parser.operate(BinaryOperator.StrictEqual, 1, 1), true);
            assert.strictEqual(Parser.operate(BinaryOperator.LessThan, 1, 2), true);
            assert.strictEqual(Parser.operate(BinaryOperator.LessThanOrEqual, 2, 2), true);
            assert.strictEqual(Parser.operate(BinaryOperator.GreaterThan, 2, 1), true);
            assert.strictEqual(Parser.operate(BinaryOperator.GreaterThanOrEqual, 2, 2), true);
            assert.strictEqual(Parser.operate(BinaryOperator.NotEqual, 1, 2), true);
            assert.strictEqual(Parser.operate(BinaryOperator.StrictNotEqual, 1, '1'), true);
            assert.strictEqual(Parser.operate(BinaryOperator.Or, 0, 5), 5);
            assert.strictEqual(Parser.operate(BinaryOperator.And, 1, 5), 5);
            assert.strictEqual(Parser.operate(BinaryOperator.Dot, { foo: 42 }, 'foo'), 42);
            assert.strictEqual(Parser.operate(BinaryOperator.Dot, 2, (x: number) => x + 1), 3);
        });

        it('throws on invalid operator', () =>
        {
            assert.throws(() => Parser.operate('invalid' as any, 1, 2));
        });
    });

    describe('parseCSV', () =>
    {
        it('parses empty array/object correctly', () =>
        {
            const cursor = new StringCursor('[]');
            const parser = new Parser();
            parser.parseArray(cursor, true);
        });

        it('throws when missing comma or end', () =>
        {
            const cursor = new StringCursor('[1 2]');
            const parser = new Parser();
            assert.throws(() => parser.parseArray(cursor, true));
        });
    });

})
