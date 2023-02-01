import * as di from './global-injector'
import orchestrator from 'orchestrator'
import { Injector, InjectableWithTypedThis, InjectableAsyncWithTypedThis, Injectable } from './injector';
import { eachAsync } from './helpers';
import { isPromiseLike } from './promiseHelpers';
import { logger } from './logger';

const orchestratorLog = logger('akala:module:orchestrator');

// process.hrtime = process.hrtime || require('browser-process-hrtime');

export class ExtendableEvent<T = void>
{
    private markAsDone: (value?: T | PromiseLike<T>) => void;
    private _triggered: boolean;
    constructor(private once: boolean)
    {
        this.reset();
    }

    private promises: PromiseLike<unknown>[] = [];

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
        this._whenDone = new Promise<T>((resolve) =>
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
                const result = f(this);
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
        const indexOfHandler = this.handlers.indexOf(handler);
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
            const index = this.handlers.push(handler);
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
        for (const p of this.promises)
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
        const existingModule = moduleInjector.resolve<Module>(name);
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
        const activateDependencies = m.dep.map(dep => dep.name + '#activate');
        Module.o.add(m.name + '#activate', activateDependencies, function ()
        {
            return m.activateEvent.trigger();
        });

        Module.o.add(m.name + '#ready', [m.name + '#activate'].concat(m.dep.map(dep => dep.name + '#ready')), function ()
        {
            return m.readyEvent.trigger();
        });

        Module.o.add(m.name, [m.name + '#ready']);

        moduleInjector.register(m.name, m);
    }

    public ready(toInject: string[], f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>)
    public ready(toInject: string[]): (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>) => this
    public ready(toInject: string[], f?: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>) => this.ready(toInject, f);
        this.readyEvent.addHandler(this.injectWithName(toInject, f));
        return this;
    }

    public readyAsync(toInject: string[], f: InjectableAsyncWithTypedThis<void, ExtendableEvent>)
    public readyAsync(toInject: string[]): (f: InjectableWithTypedThis<void, ExtendableEvent>) => this
    public readyAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<void, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<void, ExtendableEvent>) => this.readyAsync(toInject, f);
        this.readyEvent.addHandler(ev => this.injectWithNameAsync(toInject, f.bind(ev)));
        return this;
    }

    public activate(toInject: string[], f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>)
    public activate(toInject: string[]): (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>) => this
    public activate(toInject: string[], f?: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent>) => this.activate(toInject, f);
        this.activateEvent.addHandler(this.injectWithName(toInject, f));
        return this;
    }

    public activateAsync(toInject: string[], f: InjectableAsyncWithTypedThis<void, ExtendableEvent>)
    public activateAsync(toInject: string[]): (f: InjectableWithTypedThis<void, ExtendableEvent>) => this
    public activateAsync(toInject: string[], f?: InjectableAsyncWithTypedThis<void, ExtendableEvent>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<void, ExtendableEvent>) => this.activateAsync(toInject, f);
        this.activateEvent.addHandler(() => this.injectWithNameAsync(toInject, f.bind(this.activateEvent)));
        return this;
    }

    public activateNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: unknown[]) => T) =>
        {
            this.activate(toInject, function (...args)
            {
                new ctor(...args);
            });
        }
    }

    public activateNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: unknown[]) => T)
        {
            this.activateAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public readyNew(...toInject: string[])
    {
        return <T>(ctor: new (...args: unknown[]) => T) =>
        {
            this.ready(toInject, function (...args)
            {
                new ctor(...args);
            });
        }
    }

    public readyNewAsync(...toInject: string[])
    {
        return function <T>(ctor: new (...args: unknown[]) => T)
        {
            this.readyAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    public start(toInject?: string[], f?: Injectable<unknown>)
    {
        return new Promise<void>((resolve) =>
        {
            if (arguments.length > 0)
                Module.o.on('stop', this.injectWithName(toInject, f));
            Module.o.on('stop', () => resolve());
            Module.o.start(this.name);
        })
    }
}

Module['o'].on('task_start', ev => orchestratorLog.debug(ev.message))
Module['o'].on('task_stop', ev => orchestratorLog.debug(ev.message))


var moduleInjector = di.resolve<Injector>('$modules');
if (!moduleInjector)
{
    moduleInjector = new Injector();
    di.register('$modules', moduleInjector);
}

