require('source-map-support').install();

import * as parser from '../parser';
import { register } from '..';


//b*(c+d) ==> (b*c)+d


var result = <parser.ParsedBinary>parser.Parser.parseEval('b*c+d');
console.log(result.evaluate({ b: 1, c: 2, d: 3 }));
var test = new parser.ParsedBinary('*', new parser.ParsedString('b'), new parser.ParsedBinary('+', new parser.ParsedString('c'), new parser.ParsedString('d')));
parser.ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log(parser.Parser.parse("template || '/' + deviceType + '/new.html'", false)({ template: '/devices/virtualstate.html' }));
console.log(parser.Parser.parse("template || '/' + deviceType + '/new.html'", false)({ deviceType: 'pioneer' }));

register('#http', {
    build: function (formatter)
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

console.log(parser.Parser.parse("'/my/url' # http", false)({}));

console.log(parser.Parser.parse("'2018-03-12' # date", false)({}));

console.log(parser.Parser.parse("'12/03/18' # date:'dd/MM/yy'", false)({}));
console.log(parser.Parser.parse("'03/12/18' # date:'MM/dd/yy'", false)({}));
console.log(parser.Parser.parse("'3/12/18' # date:'MM/dd/yy'", false)({}));

console.log(parser.Parser.parse("{options:{in:'/api/@domojs/zigate/pending' # http, text:internalName, value:address}}", true)['options']({}));