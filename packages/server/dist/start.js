"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster = require("cluster");
process.on('warning', e => console.warn(e.stack));
if (process.argv && process.argv.length > 2) {
    require('./worker');
}
else if (cluster.isMaster) {
    require('./master');
}
else {
    require('./worker');
}
//# sourceMappingURL=start.js.map