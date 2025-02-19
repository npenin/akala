// eslint-disable-next-line @typescript-eslint/no-var-requires
import 'source-map-support/register.js';

import { Parser, ParsedBinary, ParsedString } from '../parser/parser.js';
import { BinaryOperator } from '../parser/expressions/binary-operator.js';
import { Formatter, formatters } from '../formatters/index.js';
import { EvaluatorAsFunction } from '../parser/evaluator-as-function.js';

//b*(c+d) ==> (b*c)+d

const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
const result = <ParsedBinary>parser.parseEval('b*c+d', false);

console.log((evaluator.eval(result))({ b: 1, c: 2, d: 3 }));
const test = new ParsedBinary(BinaryOperator.Times, new ParsedString('b'), new ParsedBinary(BinaryOperator.Plus, new ParsedString('c'), new ParsedString('d')));
ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ template: '/devices/virtualstate.html' }));
console.log((evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ deviceType: 'pioneer' }));

class DummyHttpFormatter implements Formatter<string>
{
    public format(value: unknown)
    {
        return `$http on '${value}'`;
    }
}
formatters.register('#http', DummyHttpFormatter, true);

console.log((evaluator.eval(parser.parse("2000")))());
console.log((evaluator.eval(parser.parse("'/my/url' # http")))());
console.log((evaluator.eval(parser.parse("'2018-03-12' # toDate")))({}));
console.log((evaluator.eval(parser.parse("'12/03/18' #toDate:'dd/MM/yy'")))({}));
console.log((evaluator.eval(parser.parse("'03/12/18' #toDate:'MM/dd/yy'")))({}));
console.log((evaluator.eval(parser.parse("'3/12/18' #toDate:'MM/dd/yy'")))({}));
console.log((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}"))({})));
console.log((evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}")))({})['options']);

console.log(evaluator.eval(parser.parse('columns[0].title'))({ columns: [{ title: 'pwet' }] }))