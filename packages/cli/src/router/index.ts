import * as akala from '@akala/core'
import { each, Logger, map, Middleware, MiddlewarePromise } from '@akala/core';
import * as path from 'path'
import normalize from '../helpers/normalize';

export interface CliContext<TOptions extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>
{
    args: string[];
    argv: string[];
    options: TOptions
    commandPath?: string;
    currentWorkingDirectory: string;
    logger: Logger
}

export interface OptionParseOption
{
    flagStart: string;
    fullOptionStart: string;
    valueAssign: string;
}

const defaultOptionParseOption: OptionParseOption = { flagStart: '-', fullOptionStart: '--', valueAssign: '=' };

export interface OptionOptions
{
    aliases?: string[],
    needsValue?: boolean,
    caseSensitive?: boolean,
    normalize?: boolean | 'require' | 'requireMeta';
    doc?: string;
}

class OptionMiddleware implements akala.Middleware<[context: CliContext]>
{
    matchers: { isFull: boolean; pattern: RegExp; }[] = []
    constructor(private readonly name: string, private options?: OptionOptions, private parseOptions: OptionParseOption = defaultOptionParseOption)
    {
        const names = [name, ...options?.aliases || []];
        names.forEach(n =>
        {
            if (n.length > 1)
                this.matchers.push({
                    isFull: true,
                    pattern: new RegExp('^' + parseOptions.fullOptionStart + akala.introspect.escapeRegExp(n) + '(?:' + parseOptions.valueAssign + '(.*))?$', options?.caseSensitive ? 'gi' : 'g')
                });
            else
                this.matchers.push({
                    isFull: false,
                    pattern: new RegExp('^' + parseOptions.flagStart + '([^-' + akala.introspect.escapeRegExp(n) + ']*)([' + akala.introspect.escapeRegExp(n) + ']+)', options?.caseSensitive ? 'gi' : 'g')
                });
        });
    }

    handle(context: CliContext): akala.MiddlewarePromise
    {
        for (let index = 0; index < context.args.length; index++)
        {
            let element = context.args[index];
            if (element == '--')
                break;
            for (let jndex = 0; jndex < this.matchers.length; jndex++)
            {
                const matcher = this.matchers[jndex];
                let match = matcher.pattern.exec(element);
                if (!match)
                    continue;
                do
                {
                    var value: string | boolean = '';
                    if (matcher.isFull)
                    {
                        if (match[1])
                        {
                            value = match[1];
                            context.args.splice(index, 1);
                            index--;
                        }
                        else if (this.options?.needsValue)
                        {
                            if (context.args.length == index + 1)
                                return Promise.resolve(new Error('No value was given for option ' + this.name));
                            value = context.args[index + 1];
                            context.args.splice(index, 2);
                            index--;
                        }
                        else
                        {
                            value = true;
                            context.args.splice(index, 1);
                            index--;
                        }
                    }
                    else
                    {
                        if (this.options?.needsValue)
                        {
                            value += context.args[index + 1 + match[1].length];
                            context.args.splice(index + 1, 1);
                        }
                        else if (match[2])
                            value += match[2].length;
                        else
                            value = true;
                        element = this.parseOptions.flagStart + match[1] + element.substring(match[0].length)
                        if (element == '-')
                        {
                            context.args.splice(index, 1);
                            index--;
                        }
                    }
                    if (value)
                        if (this.options?.normalize)
                        {
                            try
                            {
                                context.options[this.name] = normalize(this.options.normalize, context.currentWorkingDirectory, value.toString())
                            }
                            catch (e)
                            {
                                return e;
                            }
                        }
                        else
                            context.options[this.name] = value;
                }
                while ((match = matcher.pattern.exec(element)));
            }
        }
        return Promise.resolve();
    }
}

function formatUsage(obj: Record<string, string>, indent?: number): string
{
    indent = indent || 0;
    var indentS = ''.padStart(indent, ' ');
    var preparedNames = map(obj, (_option, optionName) =>
    {
        if (typeof (optionName) != 'string')
            return null;
        return { usage: indentS + optionName, optionName };
    }, true);

    const nameColumnMaxLength = Math.ceil(preparedNames.reduce((previous, current) => Math.max(previous, current.usage.length), 0)) + 4;

    return preparedNames.filter(v => v)
        .map(c =>
        {
            c.usage = c.usage.padEnd(nameColumnMaxLength, ' ');

            if (obj[c.optionName])
                return c.usage + obj[c.optionName].split('\n').join('\n' + ''.padStart(nameColumnMaxLength, ' '));
            return c.usage;
        }).join('\n');
}

class OptionsMiddleware<TOptions extends Record<string, string | number | boolean | string[]>> implements akala.Middleware<[context: CliContext]>
{
    usage()
    {
        return formatUsage(Object.fromEntries(map(this.config, (option, optionName) =>
        {
            if (typeof (optionName) != 'string')
                return null;
            var usage = (optionName.length == 1 ? defaultOptionParseOption.flagStart : defaultOptionParseOption.fullOptionStart) + optionName;
            if (option?.aliases?.length > 0)
            {
                usage += ',' + option.aliases.map(v => (v.length == 1 ? defaultOptionParseOption.flagStart : defaultOptionParseOption.fullOptionStart) + v).join(', ');
            }

            if (option?.needsValue)
                usage += ' value';

            return [usage, option?.doc];
        }, true)), 4);
    }

    private options = new akala.MiddlewareComposite<[CliContext]>();
    public config: { [key: string]: OptionOptions } = {};

    option<TValue extends string | number | boolean | string[], TName extends string>(name: TName, option?: OptionOptions): OptionsMiddleware<TOptions & { [key in TName]: TValue }>
    {
        this.config[name] = option;
        return this.optionMiddleware(new OptionMiddleware(name, option));
    }

    optionMiddleware<TValue extends string | number | boolean | string[] = string | number | boolean | string[], TName extends string = string>(middleware: OptionMiddleware): OptionsMiddleware<TOptions & Record<TName, TValue>>
    {
        this.options.useMiddleware(middleware);
        return this;
    }

    handle(context: CliContext<TOptions>): akala.MiddlewarePromise
    {
        return this.options.handle(context);
    }
}

class UsageError extends Error
{
    constructor(cli: string)
    {
        super(`Invalid usage. This command requires the following arguments: ${cli}`);
    }
}

export class NamespaceMiddleware<TOptions extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>> extends akala.MiddlewareIndexed<[CliContext<TOptions>], NamespaceMiddleware> implements akala.Middleware<[context: CliContext]>
{
    private _preAction: akala.Middleware<[CliContext<TOptions>]>;
    private _action: akala.Middleware<[CliContext<TOptions>]>;
    private readonly _option = new OptionsMiddleware();
    private _format: (result: unknown, context: CliContext<TOptions>) => void;

    constructor(name: string, private _doc?: { usage?: string, description?: string }, private _cli?: akala.Middleware<[CliContext<TOptions>]>)
    {
        super((context) => context.args[0], name);
        if (name && ~name.indexOf(' '))
            throw new Error('command name cannot contain a space');
    }

    public usage(context: CliContext<TOptions>)
    {
        var usage = '';

        if (this._doc)
        {
            if (this._doc.usage)
                usage += this._doc.usage + '\n'
            if (this._doc.description)
                usage += '\n' + this._doc.description + '\n'
        }

        const keys = this.getKeys();
        if (keys.length)
        {
            usage += '\nList of commands :\n';
            usage += formatUsage(Object.fromEntries(keys.filter(k => k[0] != '$').map(k => [k, this.index[k]._doc?.description || (this.index[k].getKeys().length ? 'use `' + k + ' --help` to get more info on this' : '')])), 4);
            usage += '\n'
        }

        var optionUsage = this._option.usage();

        if (optionUsage)
            usage += '\nOptions:\n' + optionUsage;


        return usage;
    }

    public command<TOptions2 extends Record<string, string | boolean | string[] | number> = TOptions>(name: string, description?: string): NamespaceMiddleware<TOptions2 & TOptions>
    {
        let middleware: NamespaceMiddleware<TOptions & TOptions2>;
        if (name !== null)
        {
            var cli = /^((?:@?[/$_#\w-]+)(?: ([@$_#\w-]+))*)((?: (?:<\w+>))*(?: (?:\[\w+\]))*)/.exec(name);
            if (!cli || cli[0].length != name.length)
                throw new Error(`${name} must match the following syntax: name <mandatoryparameters> [optionalparameters].`)

            if (cli[2])
                return this.command(cli[1].substring(0, cli[1].length - cli[2].length - 1)).command<TOptions2>(cli[2] + cli[3], description);

            var args = cli[3];
            var parameters: { name: keyof TOptions2 | keyof TOptions, optional: boolean }[] = [];
            var parameter: RegExpExecArray;
            const parameterParsing = / <(\w+)>| \[(\w+)\]/g;
            // eslint-disable-next-line no-cond-assign
            while (parameter = parameterParsing.exec(args))
            {
                if (parameter[0][1] == '<')
                    parameters.push({ name: parameter[1], optional: false })
                else
                    parameters.push({ name: parameter[2], optional: true });
            }

            if (parameters.length == 0 && description == null && this.index[cli[1]])
                return this.index[cli[1]] as NamespaceMiddleware<TOptions & TOptions2>;

            middleware = new NamespaceMiddleware(cli[1], { usage: name, description }, akala.convertToMiddleware(function (context)
            {
                if (context.args.length < (~parameters.findIndex(p => p.optional) || parameters.length))
                    throw new UsageError(name);

                for (let index = 0; index < parameters.length; index++)
                {
                    const parameter = parameters[index];
                    // if (!parameter.optional)
                    context.options[parameter.name] = context.args.shift() as (TOptions & TOptions2)[typeof parameter.name];
                    if (middleware._option?.config && middleware._option.config[parameter.name as string]?.normalize)
                        context.options[parameter.name] = path.resolve(context.currentWorkingDirectory, context.options[parameter.name] as string) as (TOptions & TOptions2)[typeof parameter.name];
                    // if (parameter.optional)
                    //     context.options[parameter.name] = context.args.shift() as TOptions2[typeof parameter.name];
                }
                return Promise.reject();
            }));
        }
        else
            middleware = new NamespaceMiddleware(null);
        super.useMiddleware(cli && cli[1] || name, middleware);
        return middleware;
    }

    public preAction(handler: (context: CliContext<TOptions>) => Promise<void>): this
    {
        this._preAction = { async handle(c) { try { await handler(c) } catch (e) { return e } } };
        return this;
    }

    public action(handler: (context: CliContext<TOptions>) => Promise<unknown> | void)
    {
        this.use(akala.convertToMiddleware((...args) =>
        {
            var result = handler(...args);
            if (result && akala.isPromiseLike(result))
                return result;
            return Promise.resolve(result);

        }));
    }

    public use(handler: Middleware<[CliContext<TOptions>]>)
    {
        this._action = handler
    }

    options<T extends { [key: string]: string | number | boolean | string[] }>(options: { [key in Exclude<keyof T, number | symbol>]: OptionOptions }) 
    {
        akala.each(options, (o, key) =>
        {
            this.option<T[typeof key], typeof key>(key, o);
        });
        return this as unknown as NamespaceMiddleware<T>;
    }

    option<TValue extends string | number | boolean | string[] = string | number | boolean | string[], TName extends string = string>(name: TName, option?: OptionOptions)
        : NamespaceMiddleware<TOptions & { [key in TName]: TValue }>
    {
        this._option.option<TValue, TName>(name, option);
        return this as unknown as NamespaceMiddleware<TOptions & { [key in TName]: TValue }>;
    }

    format(handler: (result: unknown, context: CliContext<TOptions>) => void): void
    {
        this._format = handler;
    }

    async handle(context: CliContext<TOptions>): akala.MiddlewarePromise
    {
        var args = context.args.slice(0);
        if (this.name === null || context.args[0] == this.name)
        {
            if (this.name !== null)
                context.args.shift();
            var error = await this._option.handle(context);
            if (error)
                return error;
            if (context.options.help && !this.index[context.args[0]])
                return this.handleError(new Error(this.usage(context)), context);
            if (this._cli)
                error = await this._cli.handle(context);
            if (error)
                return error;
            if (this._preAction)
                error = await this._preAction.handle(context)
            if (error)
                return error;
            return super.handle(context).then(async err =>
            {
                if (err)
                    if (err === 'break')
                        return;
                    else
                        return this.handleError(err, context);
                if (this._action)
                    var result = await this._action.handle(context);
                context.args = args;
                return result;
            }).catch(result =>
            {
                if (this._format)
                    throw this._format(result, context);
                throw result;
            })
        }
    }
}

const mainRouter = new NamespaceMiddleware(null);
const cmd = mainRouter;

export default cmd;
