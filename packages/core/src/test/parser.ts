// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Parser, ParsedBinary, ParsedString } from '../parser/parser.js';
import { defaultInjector } from '../injector.js';
import { BinaryOperator } from '../parser/expressions/binary-operator.js';
import { EvaluatorAsFunction } from '../parser/evaluator-as-function.js';


//b*(c+d) ==> (b*c)+d

const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
const result = <ParsedBinary>parser.parseEval('b*c+d');

console.log((await evaluator.eval(result))({ b: 1, c: 2, d: 3 }));
const test = new ParsedBinary(BinaryOperator.Times, new ParsedString('b'), new ParsedBinary(BinaryOperator.Plus, new ParsedString('c'), new ParsedString('d')));
ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log((await evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ template: '/devices/virtualstate.html' }));
console.log((await evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'")))({ deviceType: 'pioneer' }));

defaultInjector.register('#http', {
    build: function ()
    {
        return function (value)
        {
            return `$http on '${value}'`;
        }
    }, parse: function ()
    {
        return false;
    }
}, true);

console.log((await evaluator.eval(parser.parse("'/my/url' # http")))({}));
console.log((await evaluator.eval(parser.parse("'2018-03-12' # date")))({}));
console.log((await evaluator.eval(parser.parse("'12/03/18' # date:'dd/MM/yy'")))({}));
console.log((await evaluator.eval(parser.parse("'03/12/18' # date:'MM/dd/yy'")))({}));
console.log((await evaluator.eval(parser.parse("'3/12/18' # date:'MM/dd/yy'")))({}));
console.log((await evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}"))['options'])({}));