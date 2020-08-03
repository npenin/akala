import * as di from './global-injector'
import orchestrator from 'orchestrator'
import { Injector, InjectableWithTypedThis, InjectableAsyncWithTypedThis, Injectable } from './injector';
import { eachAsync } from './helpers';
import debug from 'debug'

const orchestratorLog = debug('akala:module:orchestrator');

process.hrtime = process.hrtime || require('browser-process-hrtime');

export class ExtendableEvent
{
    private markAsDone: (value?: void | PromiseLike<void>) => void;
    private _triggered: boolean;
    constructor()
    {
        this._whenDone = new Promise<void>((resolve, reject) =>
        {
            this.markAsDone = resolve;
        })
    }

    private promises: PromiseLike<any>[] = [];

    public waitUntil<T>(p: PromiseLike<T>): void
    {
        this.promises.push(p)
    }

    private handlers: ((ev: this) => void | PromiseLike<void>)[] = [];

    public async trigger()
    {
        if (!this._triggered)
        {
            this._triggered = true;
            await eachAsync(this.handlers, (f, i, next) =>
            {
                var result = f(this);
                if (result && typeof result.then === 'function')
                    result.then(() => next(), next);
                else
                    next();
            });
        }
        await this.complete();
    }

    public addHandler(handler: (ev: this) => void | PromiseLike<void>)
    {
        if (this._done || this._triggered)
        {
            handler(this);
        }
        else
            this.handlers.push(handler);
    }

    public get triggered()
    {
        return this._triggered;
    }

    private readonly _whenDone: Promise<void>;

    public get whenDone(): Promise<void>
    {
        return this._whenDone;
    }

    public async complete()
    {
        for (var p of this.promises)
        {
            await p;
        }
        this.markAsDone();
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
    }

    private static o = new orchestrator();

    public readonly activateEvent = new ExtendableEvent();
    public readonly readyEvent = new ExtendableEvent();

    public addDependency(m: Module)
    {
        if (this.dep.indexOf(m) != -1)
            return;
        delete Module.o.tasks[this.name + '#activate'];
        delete Module.o.tasks[this.name + '#ready'];
        delete Module.o.tasks[this.name];
        this.dep.push(m);
        moduleInjector.unregister(this.name);
        Module.registerModule(this);
    }

    public static registerModule(m: Module)
    {
        if (typeof m.dep == 'undefined')
            m.dep = [];
        var activateDependencies = m.dep.map(dep => dep.name + '#activate');
        Module.o.add(m.name + '#activate', activateDependencies, function ()
        {
            return m.activateEvent.trigger();
        });

        Module.o.add(m.name + '#ready', [m.name + '#activate'].concat(m.dep.map(dep => dep.name + '#ready')), function ()
        {
            return m.readyEvent.trigger();
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
        this.readyEvent.addHandler(this.injectWithName(toInject, f));
        return this;
    }

    public readyAsync(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public readyAsync(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public readyAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<any, ExtendableEvent>) => this.readyAsync(toInject, f);
        this.readyEvent.addHandler(ev => this.injectWithNameAsync(toInject, f.bind(ev)));
        return this;
    }

    public activate(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public activate(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public activate(toInject: string[], f?: InjectableWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<any, ExtendableEvent>) => this.activate(toInject, f);
        this.activateEvent.addHandler(this.injectWithName(toInject, f));
        return this;
    }

    public activateAsync(toInject: string[], f: InjectableWithTypedThis<any, ExtendableEvent>)
    public activateAsync(toInject: string[]): (f: InjectableWithTypedThis<any, ExtendableEvent>) => this
    public activateAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<any, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<any, ExtendableEvent>) => this.activateAsync(toInject, f);
        this.activateEvent.addHandler(ev => this.injectWithNameAsync(toInject, f.bind(this.activateEvent)));
        return this;
    }

    public activateNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: any[]) => T) =>
        {
            this.activate(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public activateNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: any[]) => T)
        {
            this.activateAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public readyNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: any[]) => T) =>
        {
            this.ready(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public readyNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: any[]) => T)
        {
            this.readyAsync(toInject, function (...args)
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

Module['o'].on('task_start', ev => orchestratorLog(ev.message))
Module['o'].on('task_stop', ev => orchestratorLog(ev.message))


var moduleInjector = di.resolve<Injector>('$modules');
if (!moduleInjector)
{
    moduleInjector = new Injector();
    di.register('$modules', moduleInjector);
}

