import { getParamNames } from './reflect';

export class Injector
{
    constructor(private parent?: Injector)
    {
        if (this.parent == null)
            this.parent = defaultInjector;
    }

    public inject<T extends Function>(a: T)
    {
        return this.injectWithName(a['$inject'] || getParamNames(a), a);
    }

    public resolve(param: string)
    {
        if (typeof (this.injectables[param]) != 'undefined')
            return this.injectables[param];
        if (this.parent)
            return this.parent.resolve(param);
        return null;
    }

    public inspect()
    {
        console.log(this.injectables);
    }

    public injectWithName(toInject: string[], a: Function)
    {
        var paramNames = <string[]>getParamNames(a);
        var self = this;
        if (paramNames.length == toInject.length)
        {
            return function (instance?: any)
            {
                var args = [];
                for (var param of toInject)
                {
                    args[args.length] = self.resolve(param)
                }
                return a.apply(instance, args);
            }
        }
        else
            return function (instance?: any)
            {
                var args = [];
                var unknownArgIndex = 0;
                for (var param of paramNames)
                {
                    if (param in toInject)
                        args[args.length] = self.resolve(param)
                    else if (typeof (arguments[unknownArgIndex]) != 'undefined')
                        args[args.length] = arguments[unknownArgIndex++];
                    else
                        args[args.length] = null;
                }
                return a.apply(instance, args);
            }
    }


    private injectables = {};

    public register(name: string, value: any, override?: boolean)
    {
        this.registerDescriptor(name, { value: value, writable: false }, override);
        return value;
    }
    public registerFactory(name: string, value: () => any, override?: boolean)
    {
        this.registerDescriptor(name, {
            get: function ()
            {
                return value();
            }
        }, override);
        return value;
    }
    public registerDescriptor(name: string, value: PropertyDescriptor, override?: boolean)
    {
        if (override || typeof (this.injectables[name]) == 'undefined')
            Object.defineProperty(this.injectables, name, value);
        else
            throw new Error('There is already a registered item for ' + name);
    }
}

if (!global['$$defaultInjector'])
    global['$$defaultInjector'] = new Injector();

var defaultInjector: Injector = global['$$defaultInjector'];

export function resolve(name: string)
{
    return defaultInjector.resolve(name);
}

export function inspect()
{
    return defaultInjector.inspect();
}

export function inject(a: Function)
{
    return defaultInjector.inject(a);
}

export function injectWithName(toInject: string[], a: Function)
{
    return defaultInjector.injectWithName(toInject, a);
}

export function register(name: string, value: any, override?: boolean)
{
    return defaultInjector.register(name, value, override);
}
export function registerFactory(name: string, value: () => any, override?: boolean)
{
    return defaultInjector.registerFactory(name, value, override);
}