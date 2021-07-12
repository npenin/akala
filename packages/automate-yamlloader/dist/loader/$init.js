"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const pm_1 = require("@akala/pm");
async function default_1(config) {
    const automate = await pm_1.sidecar()['@akala/automate'];
    await automate.dispatch('register-loader', '.yml');
    await automate.dispatch('register-loader', '.yaml');
}
exports.default = default_1;
//# sourceMappingURL=$init.js.map