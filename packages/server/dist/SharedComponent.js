"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var di = require("akala-core");
var debug = require("debug");
var log = debug('akala:shared-component');
var $ = require("underscore");
// log = console.log.bind(console);
var SharedComponent = (function () {
    function SharedComponent(eventName) {
        this.eventName = eventName;
    }
    SharedComponent.prototype.receive = function (onAdd) {
        var _this = this;
        di.injectNewWithName(['$bus'], function (bus) {
            log(_this.eventName);
            bus.on(_this.eventName, onAdd);
        })(this);
    };
    // to be used in master file
    SharedComponent.prototype.registerMaster = function () {
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
    };
    return SharedComponent;
}());
exports.SharedComponent = SharedComponent;
//to be used in worker file
var ComponentFactory = (function () {
    function ComponentFactory(config, bus) {
        this.config = config;
        this.bus = bus;
    }
    return ComponentFactory;
}());
exports.ComponentFactory = ComponentFactory;
var Component = (function () {
    function Component(eventName, bus) {
        this.eventName = eventName;
        this.bus = bus;
    }
    Component.prototype.merge = function (o) {
        for (var _i = 0, _a = Object.getOwnPropertyNames(this); _i < _a.length; _i++) {
            var property = _a[_i];
            if (property == 'eventName' || property == 'bus')
                continue;
            this[property] = o[property];
        }
    };
    Component.prototype.serialize = function () {
        var serializable = {};
        for (var _i = 0, _a = Object.getOwnPropertyNames(this); _i < _a.length; _i++) {
            var property = _a[_i];
            if (property == 'eventName' || property == 'bus')
                continue;
            serializable[property] = this[property];
        }
        return serializable;
    };
    Component.prototype.register = function () {
        this.bus.emit(this.eventName, this.serialize());
    };
    return Component;
}());
exports.Component = Component;
//# sourceMappingURL=SharedComponent.js.map