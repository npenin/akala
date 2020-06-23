import * as di from './global-injector'
import orchestrator from 'orchestrator'
import Emittery, { EventEmitter } from 'events'
import { Injector, InjectableWithTypedThis, InjectableAsyncWithTypedThis, Injectable } from './injector';
import { eachAsync } from './helpers';
import { Deferred } from '@akala/json-rpc-ws';

process.hrtime = process.hrtime || require('browser-process-hrtime');

export class ExtendableEvent
{
    private promises: PromiseLike<any>[] = [];

    public waitUntil<T>(p: PromiseLike<T>): void
    {
        this.promises.push(p)
    }

    private readonly _whenDone = new Deferred<void>();

    public get whenDone(): PromiseLike<void>
    {
        return this._whenDone;
    }

    public async complete()
    {
        for (var p of this.promises)
        {
            await p;
        }
        this._whenDone.resolve();
        this._done = true;
    }

    public get done() { return this._done; }
    private _done: boolean;
}

export class Module extends Injector
{
    constructor(public name: string, public dep?: Module[])
    {
        super(moduleInjector);
        var existingModule = moduleInjector.resolve<Module>(name);
        if (existingModule && typeof (existingModule.dep) != 'undefined' && existingModule.dep.length && typeof (dep) != 'undefined' && dep.length)
            throw new Error('the module ' + existingModule.name + ' can be registered only once with dependencies');
        if (existingModule)
        {
            if (typeof (dep) != 'undefined')
            {
                delete Module.o.tasks[name + '#activate'];
                delete Module.o.tasks[name + '#ready'];
                delete Module.o.tasks[name];
                existingModule.dep = dep;
                moduleInjector.unregister(name);
                Module.registerModule(existingModule);
            }
            return existingModule;
        }
        Module.registerModule(this);
        this.emitter.setMaxListeners(0);
    }

    private emitter = new EventEmitter();

    private static o = new orchestrator();

    public readonly activateEvent = new ExtendableEvent();
    public readonly readyEvent = new ExtendableEvent();

    public static registerModule(m: Module)
    {
        var emitter = m.emitter;
        if (typeof m.dep == 'undefined')
            m.dep = [];
        var activateDependencies = m.dep.map(dep => dep.name + '#activate');
        Module.o.add(m.name + '#activate', activateDependencies, async function ()
        {
            var handlers = emitter.rawListeners('activate');
            await eachAsync(handlers, (f, i, next) =>
            {
                var result = f(m.activateEvent);
                if (result && typeof result.then === 'function')
                    result.then(() => next(), next);
                else
                    next();
            });
            await m.activateEvent.complete();
        });

        Module.o.add(m.name + '#ready', [m.name + '#activate'].concat(m.dep.map(dep => dep.name + '#ready')), async function ()
        {
            var handlers = emitter.rawListeners('ready');
            await eachAsync(handlers, (f, i, next) =>
            {
                var result = f(m.readyEvent);
                if (result && typeof result.then === 'function')
                    result.then(() => next(), next);
            })
            await m.readyEvent.complete();
        });

        Module.o.add(m.name, [m.name + '#ready'], function () { });

        moduleInjector.register(m.name, m);
    }

    public ready(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public ready(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public ready(toInject: string[], f?: InjectableWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<any, ExtendableEvent>) => this.ready(toInject, f);
        if (this.readyEvent.done)
            this.injectWithName(toInject, f)();
        else
            this.emitter.on('ready', this.injectWithName(toInject, f));
        return this;
    }

    public readyAsync(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public readyAsync(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public readyAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<any, ExtendableEvent>) => this.readyAsync(toInject, f);
        if (this.readyEvent.done)
            return this.injectWithNameAsync(toInject, f.bind(this.readyEvent) as InjectableAsyncWithTypedThis<any, ExtendableEvent>);
        else
            this.emitter.on('ready', (ev) => { this.injectWithNameAsync(toInject, f.bind(ev) as InjectableAsyncWithTypedThis<any, ExtendableEvent>) });
        return this;
    }

    public activate(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public activate(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public activate(toInject: string[], f?: InjectableWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<any, ExtendableEvent>) => this.activate(toInject, f);
        if (this.activateEvent.done)
            this.injectWithName(toInject, f)();
        else
            this.emitter.on('activate', this.injectWithName(toInject, f));
        return this;
    }

    public activateAsync(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public activateAsync(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public activateAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<any, ExtendableEvent>) => this.activateAsync(toInject, f);
        if (this.readyEvent.done)
            return this.injectWithNameAsync(toInject, f.bind(this.readyEvent) as InjectableAsyncWithTypedThis<any, ExtendableEvent>);
        else
            this.emitter.on('activate', (ev: ExtendableEvent) => { this.injectWithNameAsync(toInject, f.bind(ev) as InjectableAsyncWithTypedThis<any, ExtendableEvent>) });
        return this;
    }

    public activateNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: any[]) => T) =>
        {
            return this.activate(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public activateNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: any[]) => T)
        {
            return this.activateAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public readyNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: any[]) => T) =>
        {
            return this.ready(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public readyNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: any[]) => T)
        {
            return this.readyAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public start(toInject?: string[], f?: Injectable<any>)
    {
        return new Promise<void>((resolve, reject) =>
        {
            if (arguments.length > 0)
                Module.o.on('stop', this.injectWithName(toInject, f));
            Module.o.on('stop', () => resolve());
            Module.o.start(this.name);
        })
    }
}


var moduleInjector = di.resolve<Injector>('$modules');
if (!moduleInjector)
{
    moduleInjector = new Injector();
    di.register('$modules', moduleInjector);
}

