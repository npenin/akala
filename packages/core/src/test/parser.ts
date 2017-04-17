import * as parser from '../parser';

//b*(c+d) ==> (b*c)+d

var result = <parser.ParsedBinary>parser.Parser.parseEval('b*c+d');
console.log(result.evaluate({ b: 1, c: 2, d: 3 }));
var test = new parser.ParsedBinary('*', new parser.ParsedString('b'), new parser.ParsedBinary('+', new parser.ParsedString('c'), new parser.ParsedString('d')));
parser.ParsedBinary.applyPrecedence(test);
console.log(test.toString());

console.log(parser.Parser.parse("template || '/' + deviceType + '/new.html'", false)({ template: '/devices/virtualstate.html' }));
console.log(parser.Parser.parse("template || '/' + deviceType + '/new.html'", false)({ deviceType: 'pioneer' }));

