import { Parser, ParsedBinary, ParsedString, StringCursor } from '../parser/parser.js';
import { BinaryOperator } from '../parser/expressions/binary-operator.js';
import { Formatter, formatters } from '../formatters/index.js';
import { EvaluatorAsFunction } from '../parser/evaluator-as-function.js';
import { ObservableArray } from '../observables/array.js';
import { it, describe } from 'node:test'
import assert from 'assert/strict'
import { delay } from '../promiseHelpers.js';

//b*(c+d) ==> (b*c)+d

const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
describe('parser tests', () =>
{
    it('should do math', () =>
    {
        const cursor = new StringCursor('b*c+d');
        const result = <ParsedBinary>parser.parseEval(cursor, false);
        console.log(result);
        assert.strictEqual('b*c+d'.length, cursor.offset)
        assert.strictEqual((evaluator.eval(result))({ b: 1, c: 2, d: 3 }), 5);
    });

    it('should apply precedence', () =>
    {

        const test = new ParsedBinary(BinaryOperator.Times, new ParsedString('b'), new ParsedBinary(BinaryOperator.Plus, new ParsedString('c'), new ParsedString('d')));
        ParsedBinary.applyPrecedence(test);

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
        assert.strictEqual((evaluator.eval(parser.parse("'2018-03-12' # toDate")))({}).valueOf(), new Date(2018, 2, 12).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'12/03/18' #toDate:'dd/MM/yy'")))({}).valueOf(), new Date(2018, 2, 12).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'03/12/18' #toDate:'MM/dd/yy'")))({}).valueOf(), new Date(2018, 2, 12).valueOf());
        assert.strictEqual((evaluator.eval(parser.parse("'3/12/18' #toDate:'MM/dd/yy'")))({}).valueOf(), new Date(2018, 2, 12).valueOf());
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

})
