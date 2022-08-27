// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Parser, ParsedBinary, ParsedString } from '../parser/parser';
import { defaultInjector } from '../injector';
import { BinaryOperator } from '../parser/expressions/binary-operator';
import { EvaluatorAsFunction } from '../parser/evaluator-as-function';


//b*(c+d) ==> (b*c)+d

const parser = new Parser();
const evaluator = new EvaluatorAsFunction();
const result = <ParsedBinary>parser.parseEval('b*c+d');

console.log(evaluator.eval(result)({ b: 1, c: 2, d: 3 }));
const test = new ParsedBinary(BinaryOperator.Times, new ParsedString('b'), new ParsedBinary(BinaryOperator.Plus, new ParsedString('c'), new ParsedString('d')));
ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log(evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'"))({ template: '/devices/virtualstate.html' }));
console.log(evaluator.eval(parser.parse("template || '/' + deviceType + '/new.html'"))({ deviceType: 'pioneer' }));

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

console.log(evaluator.eval(parser.parse("'/my/url' # http"))({}));
console.log(evaluator.eval(parser.parse("'2018-03-12' # date"))({}));
console.log(evaluator.eval(parser.parse("'12/03/18' # date:'dd/MM/yy'"))({}));
console.log(evaluator.eval(parser.parse("'03/12/18' # date:'MM/dd/yy'"))({}));
console.log(evaluator.eval(parser.parse("'3/12/18' # date:'MM/dd/yy'"))({}));
console.log(evaluator.eval(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}"))['options']({}));