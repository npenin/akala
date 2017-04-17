"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const di = require("@akala/core");
const debug = require("debug");
var log = debug('akala:shared-component');
const $ = require("underscore");
// log = console.log.bind(console);
class SharedComponent {
    constructor(eventName) {
        this.eventName = eventName;
    }
    receive(onAdd) {
        di.injectWithName(['$bus'], (bus) => {
            log(this.eventName);
            bus.on(this.eventName, onAdd);
        })(this);
    }
    // to be used in master file
    registerMaster() {
        var eventName = this.eventName;
        di.injectWithName(['$router', '$$modules', '$$socketModules', '$$sockets', '$module'], function (router, modules, socketModules, sockets, moduleName) {
            $.each(Object.keys(socketModules), function (socket) {
                if (socket == moduleName)
                    return;
                log('registering forward for %s', socket);
                console.log('pwet');
                socketModules[socket].on(eventName, function (component) {
                    log('forwarding %s', component);
                    socketModules[moduleName].emit(eventName, component);
                    log('forwarded %s', component);
                });
            });
            sockets.on('connection', function (socket) {
                socket.on(eventName, function (component) {
                    log('forwarding %s', component);
                    socketModules[moduleName].emit(eventName, component);
                    log('forwarded %s', component);
                });
            });
        })();
    }
}
exports.SharedComponent = SharedComponent;
//to be used in worker file
class ComponentFactory {
    constructor(config, bus) {
        this.config = config;
        this.bus = bus;
    }
}
exports.ComponentFactory = ComponentFactory;
class Component {
    constructor(eventName, bus) {
        this.eventName = eventName;
        this.bus = bus;
    }
    merge(o) {
        for (let property of Object.getOwnPropertyNames(this)) {
            if (property == 'eventName' || property == 'bus')
                continue;
            this[property] = o[property];
        }
    }
    serialize() {
        var serializable = {};
        for (let property of Object.getOwnPropertyNames(this)) {
            if (property == 'eventName' || property == 'bus')
                continue;
            serializable[property] = this[property];
        }
        return serializable;
    }
    register() {
        this.bus.emit(this.eventName, this.serialize());
    }
}
exports.Component = Component;
//# sourceMappingURL=SharedComponent.js.map