"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var cluster = require("cluster");
var express = require("express");
process.on('warning', function (e) { return console.warn(e.stack); });
var app = express();
if (cluster.isMaster) {
    require('./master');
}
else {
    require('./worker');
}
//# sourceMappingURL=start.js.map