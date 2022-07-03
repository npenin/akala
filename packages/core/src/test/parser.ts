// eslint-disable-next-line @typescript-eslint/no-var-requires
require('source-map-support').install();

import { Parser } from '../parser';
import { defaultInjector } from '../injector';
import { BinaryOperator, ParsedBinary, ParsedString } from '..';


//b*(c+d) ==> (b*c)+d

const parser = new Parser();

const result = <ParsedBinary>parser.parseEval('b*c+d');
console.log(result.evaluate({ b: 1, c: 2, d: 3 }));
const test = new ParsedBinary(BinaryOperator.Times, new ParsedString('b'), new ParsedBinary(BinaryOperator.Plus, new ParsedString('c'), new ParsedString('d')));
ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log(parser.parse("template || '/' + deviceType + '/new.html'", false)({ template: '/devices/virtualstate.html' }));
console.log(parser.parse("template || '/' + deviceType + '/new.html'", false)({ deviceType: 'pioneer' }));

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

console.log(parser.parse("'/my/url' # http", false)({}));

console.log(parser.parse("'2018-03-12' # date", false)({}));

console.log(parser.parse("'12/03/18' # date:'dd/MM/yy'", false)({}));
console.log(parser.parse("'03/12/18' # date:'MM/dd/yy'", false)({}));
console.log(parser.parse("'3/12/18' # date:'MM/dd/yy'", false)({}));

console.log(parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}", true)['options']({}));