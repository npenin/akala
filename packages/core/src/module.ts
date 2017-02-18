import * as di from './injector'
import * as orchestrator from 'orchestrator'
import { EventEmitter } from 'events'

process.hrtime = process.hrtime || require('browser-process-hrtime');

export class Module extends di.Injector
{
    constructor(public name: string, public dep: string[])
    {
        super();
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
    }

    private starting: boolean;

    public run(toInject: string[], f: Function)
    {
        this.emitter.on('run', di.injectWithName(toInject, f));
    }

    public init(toInject: string[], f: Function)
    {
        if (!toInject || toInject.length == 0)
            this.emitter.on('init', f);
        else
            this.emitter.on('init', di.injectWithName(toInject, f));
    }

    public start(toInject?: string[], f?: Function)
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