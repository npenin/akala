"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pm_1 = require("@akala/pm");
const yaml_1 = __importDefault(require("yaml"));
const promises_1 = require("fs/promises");
async function load(file) {
    (await pm_1.sidecar()['@akala/automate']).dispatch('load', yaml_1.default.parse(await promises_1.readFile(file, 'utf8')));
}
exports.default = load;
//# sourceMappingURL=load.js.map