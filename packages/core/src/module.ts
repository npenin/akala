import * as di from './global-injector'
import orchestrator from 'orchestrator'
import { Injector, InjectableWithTypedThis, InjectableAsyncWithTypedThis, Injectable } from './injector';
import { eachAsync } from './helpers';
import debug from 'debug'
import { isPromiseLike } from './promiseHelpers';

const orchestratorLog = debug('akala:module:orchestrator');

process.hrtime = process.hrtime || require('browser-process-hrtime');

export class ExtendableEvent<T = void>
{
    private markAsDone: (value?: T | PromiseLike<T>) => void;
    private _triggered: boolean;
    constructor(private once: boolean)
    {
        this.reset();
    }

    private promises: PromiseLike<any>[] = [];

    public waitUntil<T>(p: PromiseLike<T>): void
    {
        this.promises.push(p)
    }

    public reset()
    {
        if (!this.done && this._triggered || this.done && this.once)
            throw new Error('you cannot reset an extended event if it did not complete yet');
        this.promises = [];
        this._done = false;
        this.eventArgs = null;
        this._triggered = false;
        this._whenDone = new Promise<T>((resolve, reject) =>
        {
            this.markAsDone = resolve;
        })
    }

    private handlers: ((ev: this) => void | PromiseLike<T>)[] = [];

    public eventArgs: T;

    public async trigger(value: T)
    {
        if (!this._triggered)
        {
            this.eventArgs = value;
            this._triggered = true;
            await eachAsync(this.handlers, (f, i, next) =>
            {
                var result = f(this);
                if (result && isPromiseLike(result) && typeof result.then === 'function')
                    result.then(() => next(), next);
                else
                    next();
            });
        }
        await this.complete();
        if (!this.once)
            this.reset();
    }

    public removeHandler(handler: (ev: this) => void | PromiseLike<T>)
    {
        var indexOfHandler = this.handlers.indexOf(handler);
        return indexOfHandler > -1 && this.handlers.splice(indexOfHandler, 1);
    }

    public addHandler(handler: (ev: this) => void | PromiseLike<T>): void | (() => void)
    {
        if (this._done || this._triggered)
        {
            handler(this);
        }
        else
        {
            var index = this.handlers.push(handler);
            return () =>
            {
                this.handlers.splice(index, 1);
            }
        }
    }

    public get triggered()
    {
        return this._triggered;
    }

    private _whenDone: Promise<T>;

    public get whenDone(): Promise<T>
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

    public readonly activateEvent = new ExtendableEvent(true);
    public readonly readyEvent = new ExtendableEvent(true);

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

