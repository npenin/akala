"use strict";
var Parser = (function () {
    function Parser() {
    }
    Parser.parse = function (expression) {
        return expression.split('.');
    };
    Parser.eval = function (expression, value) {
        var parts = Parser.parse(expression);
        for (var i = 0; i < parts.length; i++) {
            value = value[parts[i]];
        }
        return value;
    };
    return Parser;
}());
exports.Parser = Parser;
//# sourceMappingURL=parser.js.map