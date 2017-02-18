"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var di = require("akala-core");
var path = require("path");
di.registerFactory('$translator', function () {
    var translations = require(path.join(__dirname, 'i18n.' + di.resolve('$language') + '.json'));
    return function (key) {
        var parameters = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            parameters[_i - 1] = arguments[_i];
        }
        if (!parameters)
            return translations[key] || key;
        (translations[key] || key).replace(/\{\d+\}/g, function (m) {
            return parameters[m];
        });
    };
});
//# sourceMappingURL=translator.js.map