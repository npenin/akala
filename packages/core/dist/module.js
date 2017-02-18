"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("./injector");
const orchestrator = require("orchestrator");
const events_1 = require("events");
process.hrtime = process.hrtime || require('browser-process-hrtime');
class Module extends di.Injector {
    constructor(name, dep) {
        super();
        this.name = name;
        this.dep = dep;
        this.emitter = new events_1.EventEmitter();
        Module.registerModule(this);
    }
    static registerModule(m) {
        var emitter = m.emitter;
        Module.o.add(m.name, m.dep, function () {
            di.merge(m);
            emitter.emit('init');
            emitter.emit('run');
        });
    }
    run(toInject, f) {
        this.emitter.on('run', di.injectWithName(toInject, f));
    }
    init(toInject, f) {
        if (!toInject || toInject.length == 0)
            this.emitter.on('init', f);
        else
            this.emitter.on('init', di.injectWithName(toInject, f));
    }
    start(toInject, f) {
        if (arguments.length == 0)
            Module.o.start(this.name);
        else
            Module.o.on('stop', di.injectWithName(toInject, f));
    }
    internalStart(callback) {
        if (this.starting)
            return;
        this.starting = true;
    }
}
Module.o = new orchestrator();
exports.Module = Module;
//# sourceMappingURL=module.js.map