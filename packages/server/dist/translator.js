"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const path = require("path");
di.registerFactory('$translator', function () {
    var translations = require(path.join(__dirname, 'i18n.' + di.resolve('$language') + '.json'));
    return function (key, ...parameters) {
        if (!parameters)
            return translations[key] || key;
        return (translations[key] || key).replace(/\{\d+\}/g, function (m) {
            return parameters[m];
        });
    };
});
//# sourceMappingURL=translator.js.map