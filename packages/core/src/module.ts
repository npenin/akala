import { Orchestrator } from './orchestrator.js'
import { defaultInjector, SimpleInjector } from './injectors/simple-injector.js';
import { logger } from './logging/index.browser.js';
import { Event, type Listener } from './events/shared.js';
import { AsyncEvent, } from './events/async.js';
import { noop } from './helpers.js';
import type { Injectable, InjectableAsyncWithTypedThis, InjectableWithTypedThis, Resolvable } from './injectors/shared.js';

const orchestratorLog = logger.use('akala:module:orchestrator');

/**
 * Extended event class that supports async completion tracking
 * @template T - Type of event arguments
 * @extends AsyncEvent<[ExtendableEvent<T>]>
 */
export class ExtendableEvent<T = void> extends AsyncEvent<[ExtendableEvent<T>]>
{
    private markAsDone: (value?: T | PromiseLike<T>) => void;
    private _triggered: boolean;

    /**
     * Create an ExtendableEvent
     * @param once - Whether the event should only trigger once
     */
    constructor(private readonly once: boolean)
    {
        super(Event.maxListeners, noop);
        this.reset();
    }

    private promises: PromiseLike<unknown>[] = [];

    /**
     * Add a promise to wait for before marking event as complete
     * @template T - Type of promise result
     * @param p - Promise to wait for
     */
    public waitUntil<T>(p: PromiseLike<T>): void
    {
        this.promises.push(p)
    }

    /**
     * Reset event state for reuse (if configured with once=false)
     * @throws Error if reset during incomplete event or after single use
     */
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

    /** Event arguments passed during triggering */
    public eventArgs: T;

    /**
     * Trigger the event with given arguments
     * @param value - Arguments to pass to event handlers
     */
    public async trigger(value: T)
    {
        if (!this._triggered)
        {
            this.eventArgs = value;
            this._triggered = true;
            await super.emit(this);
        }
        await this.complete();
        if (!this.once)
            this.reset();
    }


    /**
     * Add event listener
     * @param handler - Handler function to add
     * @returns Self for chaining
     */
    public addListener(handler: Listener<[this], void | PromiseLike<void>>)
    {
        if (this._done || this._triggered)
        {
            handler(this);
        }
        else
        {
            return super.addListener(handler);
        }
    }

    /** Whether the event has been triggered */
    public get triggered()
    {
        return this._triggered;
    }

    private _whenDone: Promise<T>;

    /** Promise that resolves when event completes */
    public get whenDone(): Promise<T>
    {
        return this._whenDone;
    }

    /** Complete all pending promises and mark event done */
    public async complete()
    {
        for (const p of this.promises)
        {
            await p;
        }
        this.markAsDone();
        this._done = true;
    }

    /** Whether the event has completed */
    public get done() { return this._done; }
    private _done: boolean;
}

/** 
 * Core module management class handling dependency injection and lifecycle events
 * @extends SimpleInjector
 */
export class Module extends SimpleInjector
{
    /**
     * Create a new Module
     * @param name - Unique module name
     * @param dep - Optional array of module dependencies
     */
    constructor(public name: string, public dep?: Module[])
    {
        super(moduleInjector);
        const existingModule = moduleInjector.resolve<Module>(name);
        if (existingModule?.dep?.length && dep?.length)
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

    private static readonly o = new Orchestrator();

    /** Event triggered when module activates */
    public readonly activateEvent = new ExtendableEvent(true);
    /** Event triggered when module is fully ready */
    public readonly readyEvent = new ExtendableEvent(true);

    /**
     * Add a module dependency
     * @param m - Module to add as dependency
     */
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

    /**
     * Register a module with the orchestrator
     * @param m - Module to register
     */
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

    /**
     * Register ready handler with dependency injection
     * @template TArgs - Argument types
     * @param toInject - Names of dependencies to inject
     * @param f - Handler function
     * @returns Self for chaining
     */
    public ready<TArgs extends unknown[]>(toInject: Resolvable[], f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>)
    public ready<TArgs extends unknown[]>(toInject: Resolvable[]): (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>) => this
    public ready<TArgs extends unknown[]>(toInject: Resolvable[], f?: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>) => this.ready(toInject, f);
        this.readyEvent.addListener(this.injectWithName(toInject, f));
        return this;
    }

    /**
     * Register async ready handler with dependency injection
     * @template TArgs - Argument types
     * @param toInject - Names of dependencies to inject
     * @param f - Async handler function
     * @returns Self for chaining
     */
    public readyAsync<TArgs extends unknown[]>(toInject: Resolvable[], f: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>)
    public readyAsync<TArgs extends unknown[]>(toInject: Resolvable[]): (f: InjectableWithTypedThis<void, ExtendableEvent, TArgs>) => this
    public readyAsync<TArgs extends unknown[]>(toInject: Resolvable[], f?: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>) => this.readyAsync(toInject, f);
        this.readyEvent.addListener(this.injectWithNameAsync(toInject, f));
        return this;
    }

    /**
     * Register activation handler with dependency injection
     * @template TArgs - Argument types
     * @param toInject - Names of dependencies to inject
     * @param f - Handler function
     * @returns Self for chaining
     */
    public activate<TArgs extends unknown[]>(toInject: Resolvable[], f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>): this
    public activate<TArgs extends unknown[]>(toInject: Resolvable[]): (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>) => this
    public activate<TArgs extends unknown[]>(toInject: Resolvable[], f?: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>)
    {
        if (!f)
            return (f: InjectableWithTypedThis<void | Promise<void>, ExtendableEvent, TArgs>) => this.activate(toInject, f);
        this.activateEvent.addListener(this.injectWithName(toInject, f));
        return this;
    }

    /**
     * Register async activation handler with dependency injection
     * @template TArgs - Argument types
     * @param toInject - Names of dependencies to inject
     * @param f - Async handler function
     * @returns Self for chaining
     */
    public activateAsync<TArgs extends unknown[]>(toInject: Resolvable[], f: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>)
    public activateAsync<TArgs extends unknown[]>(toInject: Resolvable[]): (f: InjectableWithTypedThis<void, ExtendableEvent, TArgs>) => this
    public activateAsync<TArgs extends unknown[]>(toInject: Resolvable[], f?: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>)
    {
        if (!f)
            return (f: InjectableAsyncWithTypedThis<void, ExtendableEvent, TArgs>) => this.activateAsync(toInject, f);
        this.activateEvent.addListener(this.injectWithNameAsync(toInject, f));
        return this;
    }

    /**
     * Create activation handler for class instantiation
     * @param toInject - Names of dependencies to inject
     * @returns Decorator function for class constructor
     */
    public activateNew(...toInject: Resolvable[])
    {
        return <T>(ctor: new (...args: unknown[]) => T) =>
        {
            this.activate(toInject, function (...args)
            {
                new ctor(...args);
            });
        }
    }

    /**
     * Create async activation handler for class instantiation
     * @param toInject - Names of dependencies to inject
     * @returns Decorator function for class constructor
     */
    public activateNewAsync(...toInject: Resolvable[])
    {
        return function <T>(ctor: new (...args: unknown[]) => T)
        {
            this.activateAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    /**
     * Create ready handler for class instantiation
     * @param toInject - Names of dependencies to inject
     * @returns Decorator function for class constructor
     */
    public readyNew(...toInject: Resolvable[])
    {
        return <T>(ctor: new (...args: unknown[]) => T) =>
        {
            this.ready(toInject, function (...args)
            {
                new ctor(...args);
            });
        }
    }

    /**
     * Create async ready handler for class instantiation
     * @param toInject - Names of dependencies to inject
     * @returns Decorator function for class constructor
     */
    public readyNewAsync(...toInject: Resolvable[])
    {
        return function <T>(ctor: new (...args: unknown[]) => T)
        {
            this.readyAsync(toInject, function (...args)
            {
                return new ctor(...args);
            });
        }
    }

    /**
     * Start the module lifecycle
     * @template TArgs - Argument types
     * @param toInject - Names of dependencies to inject
     * @param f - Optional handler function
     * @returns Promise that resolves when module stops
     */
    public start<TArgs extends unknown[]>(toInject?: string[], f?: Injectable<unknown, TArgs>)
    {
        return new Promise<void>((resolve, reject) =>
        {
            if (toInject?.length > 0)
                Module.o.on('stop', this.injectWithName(toInject, f));
            Module.o.on('task_stop', (ev) =>
            {
                if (ev.taskName === this.name)
                    resolve()
            });
            Module.o.on('error', err => reject(err.error));
            Module.o.start(this.name);
        })
    }
}

Module['o'].on('task_start', ev => orchestratorLog.debug(ev.message))
Module['o'].on('task_stop', ev => orchestratorLog.debug(ev.message))


let moduleInjector = defaultInjector.resolve<SimpleInjector>('$modules');
if (!moduleInjector)
{
    moduleInjector = new SimpleInjector();
    defaultInjector.register('$modules', moduleInjector);
}


export function module(name: string, ...dependencies: string[]): Module
export function module(name: string, ...dependencies: Module[]): Module
export function module(name: string, ...dependencies: (Module | string)[]): Module
{
    if (dependencies?.length)
        return new Module(name, dependencies.map(m => typeof (m) == 'string' ? module(m) : m));
    return new Module(name);
}
