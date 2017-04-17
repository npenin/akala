"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
process.on('warning', e => console.warn(e.stack));
if (cluster.isMaster) {
    require('./master');
}
else {
    require('./worker');
}
//# sourceMappingURL=start.js.map