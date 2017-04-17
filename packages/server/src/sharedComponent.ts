import * as di from '@akala/core';
import * as debug from 'debug';
// import * as express from 'express';
import * as router from './router'
var log = debug('akala:shared-component');
import * as io from 'socket.io';
import * as $ from 'underscore';
import * as fs from 'fs';

// log = console.log.bind(console);

export class SharedComponent<T extends Component>
{
    constructor(private eventName: string)
    {

    }

    public receive(onAdd: (it: T) => void)
    {
        di.injectWithName(['$bus'], (bus: SocketIO.Socket) =>
        {
            log(this.eventName);
            bus.on(this.eventName, onAdd);
        })(this);
    }

    // to be used in master file
    public registerMaster()
    {
        var eventName = this.eventName;
        di.injectWithName(['$router', '$$modules', '$$socketModules', '$$sockets', '$module'], function (router: router.HttpRouter, modules: string[], socketModules: { [key: string]: SocketIO.Socket }, sockets: SocketIO.Server, moduleName: string)
        {
            $.each(Object.keys(socketModules), function (socket)
            {
                if (socket == moduleName)
                    return;
                log('registering forward for %s', socket);
                console.log('pwet');
                socketModules[socket].on(eventName, function (component: T)
                {
                    log('forwarding %s', component);
                    socketModules[moduleName].emit(eventName, component);
                    log('forwarded %s', component);
                })
            });

            sockets.on('connection', function (socket)
            {
                socket.on(eventName, function (component: T)
                {
                    log('forwarding %s', component);
                    socketModules[moduleName].emit(eventName, component);
                    log('forwarded %s', component);
                });
            });
        })();
    }
}



//to be used in worker file

export abstract class ComponentFactory<T extends Component> implements di.IFactory<T>
{
    constructor(protected config, protected bus?: SocketIO.Socket)
    {
    }

    public abstract build(): T;
}

export abstract class Component
{
    constructor(protected eventName: string, protected bus?: SocketIO.Socket)
    {
    }

    public merge(o: any)
    {
        for (let property of Object.getOwnPropertyNames(this))
        {
            if (property == 'eventName' || property == 'bus')
                continue;
            this[property] = o[property];
        }
    }

    public serialize()
    {
        var serializable = {};

        for (let property of Object.getOwnPropertyNames(this))
        {
            if (property == 'eventName' || property == 'bus')
                continue;
            serializable[property] = this[property];
        }
        return serializable;
    }

    public register() 
    {
        this.bus.emit(this.eventName, this.serialize());
    }
}