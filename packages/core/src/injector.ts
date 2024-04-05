import { getParamNames } from './reflect.js';
import { isPromiseLike } from './promiseHelpers.js';
import { EventEmitter } from 'events';
import "reflect-metadata";
import { logger } from './logger.js';
import { ExpressionVisitor } from './parser/expressions/expression-visitor.js';
import { Expression, Expressions, TypedExpression } from './parser/expressions/expression.js';
import { MemberExpression } from './parser/expressions/member-expression.js';
import { ExpressionsWithLength, Parser } from './parser/parser.js';
import { ConstantExpression } from './parser/expressions/constant-expression.js';

const log = logger('akala:core:injector');

export type Injected<T> = (instance?: unknown) => T;
export type Injectable<T> = (...args: unknown[]) => T;
export type InjectableConstructor<T> = new (...args: unknown[]) => T;
export type InjectableWithTypedThis<T, U> = (this: U, ...args: unknown[]) => T;
export type InjectableAsync<T> = (...args: unknown[]) => PromiseLike<T>;
export type InjectableAsyncWithTypedThis<T, U> = (this: U, ...args: unknown[]) => PromiseLike<T>;
export type InjectedParameter<T> = { index: number, value: T };

export function ctorToFunction<T extends unknown[], TResult>(ctor: new (...args: T) => TResult): (...parameters: T) => TResult 
{
    return (...parameters: T) =>
    {
        const args = [null];
        for (let i = 0; i < parameters.length; i++)
            args[i + 1] = parameters[i];
        return new ctor(...parameters);
    }
}

class InjectorEvaluator extends ExpressionVisitor
{
    constructor(private parent: InjectorEvaluator, private injectables: Injector['injectables'])
    {
        super();
    }

    private result: unknown;

    public eval<T>(expression: ExpressionsWithLength): T
    {
        this.result = this.injectables;
        this.visit(expression);
        return this.result as T;
    }

    visitConstant(arg0: ConstantExpression<unknown>): Expressions
    {
        this.result = arg0.value;
        return arg0;
    }

    visitMember<T, TMember extends keyof T>(arg0: MemberExpression<T, TMember, T[TMember]>): TypedExpression<T[TMember]>
    {
        if (arg0.source)
            this.visit(arg0.source);

        let source = this.result;

        this.visit(arg0.member);
        const key = this.result as string;

        if (source instanceof Injector)
        {
            this.result = source.resolve(key);
            return arg0;
        }
        if (isPromiseLike(source))
        { this.result = source.then((result) => { return result[key] }); return arg0; }
        if (source === this.injectables && typeof (source[key]) == 'undefined' && this.parent)
        {
            this.result = this.parent.eval(arg0);
            return arg0;
        }
        this.result = source && source[key];
        return arg0;
    }
}


export class Injector 
{
    public static mergeArrays(resolvedArgs: InjectedParameter<unknown>[], ...otherArgs: unknown[])
    {
        const args = [];
        let unknownArgIndex = 0;
        for (const arg of resolvedArgs.sort((a, b) => a.index - b.index))
        {
            if (arg.index === args.length)
                args[args.length] = arg.value;
            else if (typeof (otherArgs[unknownArgIndex]) != 'undefined')
                args[args.length] = otherArgs[unknownArgIndex++];
        }

        return args.concat(otherArgs.slice(unknownArgIndex));
    }

    protected getArguments(toInject: string[]): InjectedParameter<unknown>[]
    {
        return toInject.map((p, i) => ({ index: i, value: this.resolve(p) }));
    }

    constructor(protected parent?: Injector | null)
    {
        if (typeof this.parent === 'undefined')
            this.parent = defaultInjector;

        if (this.parent)
            this.evaluator = new InjectorEvaluator(this.parent.evaluator, this.injectables);
        else
            this.evaluator = new InjectorEvaluator(null, this.injectables);


        this.register('$injector', this);
    }

    private parser = new Parser();
    private evaluator: InjectorEvaluator;

    private notifier = new EventEmitter();

    public setInjectables(value: { [key: string]: unknown })
    {
        this.injectables = value;
    }

    public keys()
    {
        return Object.keys(this.injectables);
    }

    public merge(i: Injector)
    {
        Object.getOwnPropertyNames(i.injectables).forEach((property) =>
        {
            if (property != '$injector')
                this.registerDescriptor(property, Object.getOwnPropertyDescriptor(i.injectables, property));
        })
    }

    protected notify(name: string, value?: PropertyDescriptor)
    {
        if (typeof value == 'undefined')
            value = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (this.notifier.listenerCount(name) > 0)
            this.notifier.emit(name, value);
        if (this.parent)
            this.parent.notify(name, value);
    }

    public onResolve<T = unknown>(name: string): PromiseLike<T>
    public onResolve<T = unknown>(name: string, handler: (value: T) => void): void
    public onResolve<T = unknown>(name: string, handler?: (value: T) => void)
    {
        if (!handler)
            return new Promise<T>((resolve) =>
            {
                this.onResolve(name, resolve);
            })

        const value = this.resolve<T>(name);
        if (value !== undefined && value !== null)
        {
            handler(value);
            return;
        }
        if (!this.parent)
            this.notifier.once(name, (prop: PropertyDescriptor) =>
            {
                if (prop.get)
                    handler(prop.get());
                else
                    handler(prop.value);
            });
        else
            this.parent.onResolve(name, handler);
    }

    public inject<T>(a: Injectable<T>): Injected<T>
    public inject<T>(...a: string[]): (b: TypedPropertyDescriptor<Injectable<T>>) => void
    public inject<T>(a: Injectable<T> | string, ...b: string[]): Injected<T> | ((b: TypedPropertyDescriptor<Injectable<T>>) => void)
    public inject<T>(a: Injectable<T> | string, ...b: string[])
    {
        if (typeof a == 'function')
            return this.injectWithName(a['$inject'] || getParamNames(a), a);
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        return function (c: TypedPropertyDescriptor<Injectable<T>>)
        {
            if (typeof b == 'undefined')
                b = [];
            b.unshift(a as string);
            const oldf = self.injectWithName(b, c.value);
            c.value = function (...args)
            {
                return oldf.apply(this, Array.from(args));
            }
        }
    }

    public injectAsync<T>(a: Injectable<T>)
    public injectAsync(...a: string[])
    public injectAsync<T>(a: Injectable<T> | string, ...b: string[])
    {
        if (typeof a == 'function')
            return this.injectWithNameAsync(a['$inject'] || getParamNames(a), a)

        if (typeof b == 'undefined')
            b = [];
        b.unshift(a);

        return <U>(c: TypedPropertyDescriptor<InjectableAsync<U>>) =>
        {
            const f = c.value;
            c.value = function ()
            {
                return this.injectWithNameAsync(b, f);
            }
        }
    }

    public injectNew<T>(ctor: InjectableConstructor<T>)
    {
        return this.inject<T>(ctorToFunction(ctor));
    }

    public resolve<T = unknown>(param: string | ExpressionsWithLength): T
    {
        log.silly('resolving ' + param);

        if (typeof param == 'string')
            param = this.parser.parse(param);

        return this.evaluator.eval<T>(param);

        // if (typeof (this.injectables[param]) != 'undefined')
        // {
        //     if (log.verbose.enabled)
        //     {
        //         if (typeof this.injectables[param].name != 'undefined')
        //             log.verbose(`resolved ${param} to ${this.injectables[param]} with name ${this.injectables[param].name}`);
        //         else
        //             log.verbose(`resolved ${param} to %O`, this.injectables[param]);
        //     }
        //     else
        //         log.debug(`resolved ${param}`);
        //     return this.injectables[param];
        // }
        // const indexOfDot = param.indexOf('.');

        // if (~indexOfDot)
        // {
        //     const keys = param.split('.')
        //     return keys.reduce((result, key) =>
        //     {
        //         if (result instanceof Injector)
        //             return result.resolve(key);
        //         if (isPromiseLike(result))
        //             return result.then((result) => { return result[key] });
        //         if (result === this.injectables && typeof (result[key]) == 'undefined' && this.parent)
        //         {
        //             return this.parent.resolve(key);
        //         }
        //         return result && result[key];
        //     }, this.injectables);

        // }
        // if (this.parent)
        // {
        //     log.silly('trying parent injector');
        //     return this.parent.resolve<T>(param);
        // }
        // return null;
    }

    public resolveAsync<T = unknown>(name: string): T | PromiseLike<T>
    {
        return this.onResolve<T>(name);
    }

    private inspecting = false;

    public inspect()
    {
        if (this.inspecting)
            return;
        this.inspecting = true;
        console.log(this.injectables);
        this.inspecting = false;
    }

    private browsingForJSON = false;

    public toJSON()
    {
        // console.log(args);
        const wasBrowsingForJSON = this.browsingForJSON;
        this.browsingForJSON = true;
        if (!wasBrowsingForJSON)
            return this.injectables;
        this.browsingForJSON = wasBrowsingForJSON;
        return undefined;
    }

    public injectNewWithName<T>(toInject: string[], ctor: InjectableConstructor<T>)
    {
        return this.injectWithName(toInject, ctorToFunction(ctor));
    }

    public async injectWithNameAsync<T>(toInject: string[], a: InjectableAsync<T> | Injectable<T>): Promise<T>
    {
        if (!toInject || toInject.length == 0)
            return Promise.resolve<T>(a());
        const paramNames = getParamNames(a);
        let wait = false;

        if (paramNames.length == toInject.length || paramNames.length == 0)
        {
            if (toInject.length == paramNames.length && paramNames.length == 0)
                // eslint-disable-next-line @typescript-eslint/ban-types
                return await (a as Function).call(globalThis);
            else
            {
                const args = [];
                for (const param of toInject)
                {
                    args[args.length] = this.resolveAsync(param);
                    if (isPromiseLike(args[args.length - 1]))
                        wait = true;
                }
                if (wait)
                {
                    const args2 = await Promise.all(args.map(function (v)
                    {
                        if (isPromiseLike(v))
                            return v;
                        return Promise.resolve(v);
                    }));
                    return a(...args2);
                }
                else
                    return a(...args);
            }
        }
        else
            throw new Error('the number of arguments does not match the number of injected parameters');
    }


    public injectWithName<T>(toInject: string[], a: Injectable<T>): Injected<T>
    {
        if (toInject && toInject.length > 0)
        {
            const paramNames = <string[]>getParamNames(a);
            if (paramNames.length == toInject.length || paramNames.length == 0)
            {
                if (toInject.length == paramNames.length && paramNames.length == 0)
                    return <Injectable<T>>a;
            }
        }
        return (instance?: unknown, ...otherArgs: unknown[]) =>
        {
            return a.apply(instance, Injector.mergeArrays(this.getArguments(toInject), ...otherArgs));
        }
    }

    public exec<T>(...toInject: string[])
    {
        return (f: Injectable<T>) =>
        {
            return this.injectWithName(toInject, f)(this);
        }
    }

    private injectables = {};

    public unregister(name: string)
    {
        const registration = Object.getOwnPropertyDescriptor(this.injectables, name);
        if (registration)
            delete this.injectables[name];
    }

    public register<T>(name: string, value: T, override?: boolean)
    {
        if (typeof (value) != 'undefined' && value !== null)
            this.registerDescriptor(name, { value: value, enumerable: true, configurable: true }, override);
        return value;
    }
    public registerFactory<T>(name: string, value: () => T, override?: boolean)
    {
        this.register(name + 'Factory', value, override);
        this.registerDescriptor(name, {
            get: function ()
            {
                return value();
            }, enumerable: true, configurable: true
        }, override);
        return value;
    }

    public factory(name: string, override?: boolean)
    {
        return <T>(fact: () => T) =>
        {
            return this.registerFactory(name, fact, override);
        }
    }

    public service(name: string, ...toInject: string[])
    public service(name: string, override?: boolean, ...toInject: string[])
    public service(name: string, override?: boolean | string, ...toInject: string[])
    {
        let singleton;

        if (typeof toInject == 'undefined')
            toInject = [];

        if (typeof override == 'string')
        {
            toInject.unshift(override)
            override = false;
        }

        return <T>(fact: new (...args: unknown[]) => T) =>
        {
            this.registerDescriptor(name, {
                get: () =>
                {
                    if (singleton)
                        return singleton;
                    return singleton = this.injectNewWithName(toInject, fact)();
                }
            })
        }
    }

    public registerDescriptor(name: string | number | symbol, value: PropertyDescriptor, override?: boolean)
    {
        if (typeof name == 'string')
        {
            const indexOfDot = name.indexOf('.');
            if (~indexOfDot)
            {
                let nested = this.resolve(name.substring(0, indexOfDot));
                if (typeof nested == 'undefined' || nested === null)
                    this.registerDescriptor(name.substring(0, indexOfDot), { configurable: false, value: nested = new Injector() })
                if (nested instanceof Injector)
                    nested.registerDescriptor(name.substring(indexOfDot + 1), value, override);
                else
                    throw new Error('compound keys like ' + name + ' can be used only with injector-like as intermediaries')
            }
        }
        log.debug('registering ' + name.toString());
        if (!override && typeof (this.injectables[name]) != 'undefined')
            throw new Error('There is already a registered item for ' + name.toString());
        if (typeof (this.injectables[name]) !== 'undefined')
            this.unregister(name.toString());
        Object.defineProperty(this.injectables, name, value);
        this.notify(name.toString(), value);
    }
}

export var defaultInjector = new Injector(null);
