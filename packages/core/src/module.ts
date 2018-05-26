import * as di from './injector'
import * as orchestrator from 'orchestrator'
import { EventEmitter } from 'events'

process.hrtime = process.hrtime || require('browser-process-hrtime');

var moduleInjector = new di.Injector();
di.register('$modules', moduleInjector);


export class Module extends di.Injector
{
    constructor(public name: string, public dep?: string[])
    {
        super();
        var existingModule = moduleInjector.resolve(name);
        if (existingModule && dep)
            throw new Error('the module can be registered only once with dependencies');
        if (existingModule)
            return existingModule;
        Module.registerModule(this);
    }

    private emitter = new EventEmitter();

    private static o = new orchestrator();

    public static registerModule(m: Module)
    {
        var emitter = m.emitter;
        Module.o.add(m.name, m.dep, function ()
        {
            di.merge(m);
            emitter.emit('init');

            emitter.emit('run');
        });
        moduleInjector.register(m.name, m);
    }

    private starting: boolean;

    public run(toInject: string[], f: di.Injectable<any>)
    {
        this.emitter.on('run', di.injectWithName(toInject, f));
    }

    public init(toInject: string[], f: di.Injectable<any>)
    {
        if (!toInject || toInject.length == 0)
            this.emitter.on('init', f);
        else
            this.emitter.on('init', di.injectWithName(toInject, f));
    }

    public start(toInject?: string[], f?: di.Injectable<any>)
    {
        if (arguments.length == 0)
            Module.o.start(this.name);
        else
            Module.o.on('stop', <any>di.injectWithName(toInject, f));
    }

    private internalStart(callback)
    {
        if (this.starting)
            return;
        this.starting = true;
    }
}