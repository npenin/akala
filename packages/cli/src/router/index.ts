import
{
    Context,
    convertToMiddleware, each, ErrorWithStatus, introspect, isPromiseLike, map, MiddlewareAsync, MiddlewareCompositeAsync,
    MiddlewareCompositeWithPriorityAsync, MiddlewareIndexedAsync, MiddlewarePromise,
    NotHandled
} from '@akala/core';
import normalize from '../helpers/normalize.js';
import { link } from 'ansi-escapes'

export type OptionType = string | boolean | string[] | number;

export interface CliContext<TOptions extends Record<string, OptionType> = Record<string, OptionType>, TState = unknown> extends Context<TState>
{
    args: string[];
    argv: string[];
    options: TOptions
    commandPath?: string;
    currentWorkingDirectory: string;
}

export interface OptionParseOption
{
    flagStart: string;
    fullOptionStart: string;
    valueAssign: string;
}

export class ErrorMessage extends ErrorWithStatus
{
    constructor(message?: string, statusCode: number = 500, name?: string, cause?: Error)
    {
        super(statusCode, message
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => link(text, url)) // Links have to be first to prevent ansi-codes injection
            .replace(/!\[([^\]]+)\]\(([^)]+)\)/g, (_, text, url) => `[Image: ${text}]`) // Links have to be first to prevent ansi-codes injection
            , name,
            cause
        );
    }

    toString()
    {
        return this.message;
    }
}

const defaultOptionParseOption: OptionParseOption = { flagStart: '-', fullOptionStart: '--', valueAssign: '=' };

export interface OptionOptions<TValue extends OptionType>
{
    aliases?: string[],
    needsValue?: boolean,
    caseSensitive?: boolean,
    normalize?: boolean | 'import' | 'require' | 'requireMeta' | { mode: 'path' | 'import' | 'require' | 'requireMeta', relativeTo?: string };
    doc?: string;
    optional?: boolean;
    positional?: boolean;
    position?: number;
    default?: TValue;
}

type OptionOptionsType<T extends OptionOptions<OptionType>> = T extends OptionOptions<infer X> ? X : never

export type OptionsFromOptions<T extends { [key: string]: OptionOptions<OptionType> }> = { [key in keyof T]: OptionOptionsType<T[key]> }

class OptionMiddleware<TValue extends OptionType> implements MiddlewareAsync<[context: CliContext]>
{
    matchers: { isFull: boolean; pattern: RegExp; }[] = []
    constructor(private readonly name: string, private readonly options?: OptionOptions<TValue>, private readonly parseOptions: OptionParseOption = defaultOptionParseOption)
    {
        const names = [name, ...options?.aliases || []];
        names.forEach(n =>
        {
            if (n.length > 1)
                this.matchers.push({
                    isFull: true,
                    pattern: new RegExp('^' + parseOptions.fullOptionStart + introspect.escapeRegExp(n) + '(?:' + parseOptions.valueAssign + '(.*))?$', options?.caseSensitive ? 'gi' : 'g')
                });
            else
                this.matchers.push({
                    isFull: false,
                    pattern: new RegExp('^' + parseOptions.flagStart + '([^-' + introspect.escapeRegExp(n) + ']*)([' + introspect.escapeRegExp(n) + ']+)', options?.caseSensitive ? 'gi' : 'g')
                });
        });
    }

    handle(context: CliContext): MiddlewarePromise
    {
        if (this.options?.default)
            context.options[this.name] = this.options.default;
        for (let index = 0; index < context.args.length; index++)
        {
            let element = context.args[index];
            if (element == '--')
                break;
            for (const matcher of this.matchers)
            {
                let match = matcher.pattern.exec(element);
                if (!match)
                    continue;
                do
                {
                    let value: string | boolean = '';
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
                                return Promise.resolve(e);
                            }
                        }
                        else
                            context.options[this.name] = value;
                }
                while ((match = matcher.pattern.exec(element)));
            }
        }
        return NotHandled;
    }
}

function formatUsageObject(usage: UsageObject): string
{
    let result = '';
    if (usage.text)
        result += usage.text + '\n';

    if (usage.commands && Object.keys(usage.commands).length)
        result += '\nList of commands:\n' + formatUsage(usage.commands, 4) + '\n';

    if (usage.options && Object.keys(usage.options).length)
        result += '\nOptions:\n' + formatUsage(usage.options, 4);

    return result;
}

function formatUsage(obj: Record<string, string>, indent?: number): string
{
    indent = indent || 0;
    const indentS = ''.padStart(indent, ' ');
    const preparedNames = map(obj, (_option, optionName) =>
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

class OptionsMiddleware<TOptions extends Record<string, OptionType>> implements MiddlewareAsync<[context: CliContext<TOptions>]>
{
    usage(context: CliContext<TOptions>): UsageObject['options']
    {
        return Object.fromEntries(map(this.config, (option, optionName) =>
        {
            if (typeof (optionName) != 'string')
                return null;
            let usage = (optionName.length == 1 ? defaultOptionParseOption.flagStart : defaultOptionParseOption.fullOptionStart) + optionName;
            if (option?.aliases?.length > 0)
            {
                usage += ',' + option.aliases.map(v => (v.length == 1 ? defaultOptionParseOption.flagStart : defaultOptionParseOption.fullOptionStart) + v).join(', ');
            }
            if (optionName in context.options && typeof (context.options[optionName]) !== 'undefined')
            {
                usage += ` \`${context.options[optionName]}\``
            }
            else if (option?.needsValue)
                usage += ' value';

            return [usage, Object.keys(this.config).reduce((previous, optionName) => previous?.replace(new RegExp('`' + introspect.escapeRegExp(optionName) + '`', 'm'), `\`${context.options[optionName]}\``), option?.doc)];
        }, true));
    }

    private readonly options = new MiddlewareCompositeAsync<[CliContext]>();
    private readonly positionalArgs = new MiddlewareCompositeWithPriorityAsync<[CliContext]>();
    public config: { [key in keyof TOptions]?: OptionOptions<TOptions[key]> } = {};


    option<TValue extends OptionType, const TName extends string>(name: TName, option?: OptionOptions<TValue>): OptionsMiddleware<TOptions & { [key in TName]: TValue }>
    {
        this.config[name] = option as any;
        if (option?.positional)
        {
            if (isNaN(Number(option.position)))
                throw new Error(`The option ${name} must have a position if it is meant to be positional`)
            this.positionalArgs.useMiddleware(option.position, {
                handle: context =>
                {
                    if (!context.options[name] && (!option.optional || context.args.length > 0))
                        context.options[name] = context.args.shift();
                    if (option.normalize)
                        context.options[name] = normalize(option.normalize, context.currentWorkingDirectory, context.options[name] as string);
                    return NotHandled;
                }
            });
        }
        return this.optionMiddleware(new OptionMiddleware(name, option));
    }

    optionMiddleware<TValue extends OptionType = OptionType, TName extends string = string>(middleware: OptionMiddleware<TValue>): OptionsMiddleware<TOptions & Record<TName, TValue>>
    {
        this.options.useMiddleware(middleware);
        return this as any;
    }

    handle(context: CliContext<TOptions>): MiddlewarePromise
    {
        return this.options.handle(context).then(p => typeof p == 'undefined' ? this.positionalArgs.handle(context) : p);
    }
}

export class UsageError extends ErrorMessage
{
    constructor(cli: string)
    {
        super(`Invalid usage. This command requires the following arguments: ${cli}`);
    }
}

export interface UsageObject
{
    text: string;
    commands?: Record<string, string>;
    options?: Record<string, string>;
}

export const usageParser = /^((?:@?[/$_#\w-]+)(?: ([@$_#\w-]+))*)((?: (?:<[-\w]+(?:\|[-\w]+)?>))*(?: (?:\[[-\w]+(?:\|[-\w]+)?\]))*(?: \[(?:\.{3})[-\w]+(?:\|[-\w]+)?\])?)/;


export class NamespaceMiddleware<TOptions extends Record<string, OptionType> = Record<string, OptionType>, TState = unknown> extends MiddlewareIndexedAsync<[CliContext<TOptions>], NamespaceMiddleware> implements MiddlewareAsync<[context: CliContext<TOptions, TState>]>
{
    private readonly _preAction = new MiddlewareCompositeAsync<[CliContext<TOptions, TState>]>();
    private _action: MiddlewareAsync<[CliContext<TOptions, TState>]>;
    private readonly _option = new OptionsMiddleware<TOptions>();
    private readonly _format = new MiddlewareCompositeAsync<[result: unknown, context: CliContext<TOptions, TState>]>();

    constructor(name: string, private _doc?: { usage?: string, description?: string }, private _cli?: MiddlewareAsync<[CliContext<TOptions, TState>]>)
    {
        super((context) => context.args[0], name);
        if (name && ~name.indexOf(' '))
            throw new Error('command name cannot contain a space');
    }

    public async usage(context: CliContext<TOptions>): Promise<UsageObject>
    {
        const usage: UsageObject = { text: '' };

        if (this._doc)
        {
            if (this._doc.usage)
                usage.text = this._doc.usage + '\n';
            if (this._doc.description)
                usage.text += '\n' + this._doc.description;
        }

        const keys = this.getKeys();
        if (keys.length)
            usage.commands = Object.fromEntries(keys.filter(k => k[0] != '$').map(k => [k, this.index[k]._doc?.description || (this.index[k].getKeys().length ? 'use `' + k + ' --help` to get more info on this' : '')]));
        else
            usage.commands = {};

        usage.options = this._option.usage(context);

        const delegate = this._delegate;
        if (delegate instanceof NamespaceMiddleware)
        {
            const error = await delegate._preAction.handle(context);
            if (error)
                return usage;
            const subUsage = await delegate.usage(context);
            if (subUsage.commands)
                Object.assign(usage.commands, subUsage.commands);
            if (subUsage.options)
                Object.assign(usage.options, subUsage.options);
            if (!usage.text)
                usage.text = subUsage.text;
        }

        return usage;
    }

    public command<TOptions2 extends Record<string, OptionType> = TOptions>(name: string, description?: string): NamespaceMiddleware<TOptions2 & TOptions, TState>
    {
        let middleware: NamespaceMiddleware<TOptions & TOptions2, TState>;
        if (name !== null)
        {
            var cli = usageParser.exec(name);
            if (!cli || cli[0].length != name.length)
                throw new Error(`${name} must match the following syntax: name <mandatoryparameters> [optionalparameters].`)

            if (cli[2])
                return this.command(cli[1].substring(0, cli[1].length - cli[2].length - 1)).command<TOptions2>(cli[2] + cli[3], description);

            let args = cli[3];
            let parameters: ({ name: keyof TOptions2 | keyof TOptions, rest?: boolean } & OptionOptions<TOptions[keyof TOptions] | TOptions2[keyof TOptions2]>)[] = [];
            let parameter: RegExpExecArray;
            const parameterParsing = / <([-\w]+)(?:\|[-\w]+)?>| \[([-\w]+)(?:\|[-\w]+)?\]| \[(?:\.{3})?([-\w]+)(?:\|[-\w]+)?\]/g;
            let position = 0;
            // eslint-disable-next-line no-cond-assign
            while (parameter = parameterParsing.exec(args))
            {
                if (parameter[0][1] == '<')
                    parameters.push({ name: parameter[1], optional: false, positional: true, position: position++ });
                else if (parameter[2])
                    parameters.push({ name: parameter[2], optional: true, positional: true, position: position++ });
                else
                    parameters.push({ name: parameter[3], optional: true, positional: true, position: position++, rest: true });
            }

            if (parameters.length == 0 && description == null && this.index[cli[1]])
                return this.index[cli[1]] as NamespaceMiddleware<TOptions & TOptions2, TState>;

            if (parameters.length == 0 && description == null && this._delegate instanceof NamespaceMiddleware)
                return this._delegate.command(name, description);

            middleware = new NamespaceMiddleware(cli[1], { usage: name, description }, convertToMiddleware(function (context)
            {
                if (!context.options.help && context.args.length < (~parameters.findIndex(p => p.optional) || parameters.length))
                    throw new UsageError(name);

                for (const parameter of parameters)
                {
                    const paramName = parameter.name;
                    if (!parameter.rest)
                    {
                        if (!context.options[paramName])
                        {
                            let value = context.args.shift() as (TOptions & TOptions2)[typeof paramName];
                            // context.options[paramName] = context.args.shift() as (TOptions & TOptions2)[typeof paramName];
                            if (middleware._option?.config && middleware._option.config[paramName]?.normalize && value)
                                value = normalize(middleware._option.config[paramName]?.normalize, context.currentWorkingDirectory, value as string) as (TOptions & TOptions2)[typeof parameter.name];
                            if (!context.options[paramName])
                                context.options[paramName] = value;
                        }
                    }
                    else
                    {
                        if (context.args.length)
                            context.options[paramName] = context.args.splice(0, context.args.length) as (TOptions & TOptions2)[typeof paramName];
                        else if (!context.options[paramName])
                            context.options[paramName] = [] as (TOptions & TOptions2)[typeof paramName];;
                        if (middleware._option?.config && middleware._option.config[paramName]?.normalize && context.options[paramName])
                            context.options[paramName] = (context.options[paramName] as string[]).map(param => normalize(middleware._option.config[paramName]?.normalize, context.currentWorkingDirectory, param)) as (TOptions & TOptions2)[typeof paramName];
                    }
                }

                return Promise.reject();
            }));
        }
        else
            middleware = new NamespaceMiddleware(null);
        super.useMiddleware(cli?.[1] || name, middleware);
        return middleware;
    }

    public state<TState>(): NamespaceMiddleware<TOptions, TState>
    {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return this as any;
    }

    public preAction(handler: (context: CliContext<TOptions, TState>) => Promise<void>): this
    {
        this._preAction.use(async (ctx) =>
        {
            await handler(ctx);
            throw undefined
        });
        return this;
    }

    public action(handler: (context: CliContext<TOptions, TState>) => Promise<unknown> | void)
    {
        this.use(convertToMiddleware((...args) =>
        {
            const result = handler(...args);
            if (result && isPromiseLike(result))
                return result;
            return Promise.resolve(result);

        }));
    }

    public use(handler: MiddlewareAsync<[CliContext<TOptions, TState>]>)
    {
        this._action = handler
    }

    options<TOptionOptions extends { [key: string]: OptionOptions<OptionType> }>(options: TOptionOptions): NamespaceMiddleware<TOptions & { [key in keyof TOptionOptions]: OptionType }, TState>
    options<const T extends { [key: string]: OptionType }, const TOptionOptions extends { [key in keyof T]: OptionOptions<T[keyof T]> } = { [key in keyof T]: OptionOptions<T[key]> }>(options: TOptionOptions): NamespaceMiddleware<TOptions & T, TState>
    options<const T extends { [key: string]: OptionType }, const TOptionOptions extends { [key in keyof T]: OptionOptions<T[keyof T]> } = { [key in keyof T]: OptionOptions<T[key]> }>(options: TOptionOptions): NamespaceMiddleware<TOptions & T, TState>
    {
        each(options, (o, key) =>
        {
            this.option(key as string, o);
        });
        return this as unknown as NamespaceMiddleware<T & TOptions, TState>;
    }

    option<TValue extends OptionType>(): <const TName extends string>(name: TName, options?: OptionOptions<TValue>) => NamespaceMiddleware<TOptions & { [key in TName]: TValue }, TState>
    option<TValue extends OptionType, const TName extends string>(name: TName, option?: OptionOptions<TValue>)
        : NamespaceMiddleware<TOptions & { [key in TName]: TValue }, TState>
    option<TValue extends OptionType, const TName extends string>(name?: TName, option?: OptionOptions<TValue>)
        : NamespaceMiddleware<TOptions & { [key in TName]: TValue }, TState> | (<const TName extends string>(name: TName, options?: OptionOptions<TValue>) => NamespaceMiddleware<TOptions & { [key in TName]: TValue }, TState>)
    {
        if (typeof name == 'undefined')
            return <const TName extends string>(name: TName, option?: OptionOptions<TValue>) =>
            // : NamespaceMiddleware<TOptions & { [key in TName]: TValue }>
            {
                return this.option<TValue, TName>(name, option);
            }
        this._option.option<TValue, TName>(name, option);
        return this as unknown as NamespaceMiddleware<TOptions & { [key in TName]: TValue }, TState>;
    }

    format(handler: (result: unknown, context: CliContext<TOptions, TState>) => Promise<unknown>): void
    {
        this._format.use(handler);
    }

    async handle(context: CliContext<TOptions, TState>): MiddlewarePromise
    {
        const args = context.args.slice(0);
        if (this.name === null || context.args[0] == this.name)
        {
            if (this.name !== null)
                context.args.shift();
            let error = await this._option.handle(context);
            if (error)
                return error;
            if (this._cli)
                error = await this._cli.handle(context);
            if (error)
                return error;
            if (this._preAction)
                error = await this._preAction.handle(context)
            if (error)
                return error;
            if (context.options.help && !this.index[context.args[0]])
            {
                if (this._delegate instanceof NamespaceMiddleware && context.args[0] && this._delegate.index[context.args[0]])
                    return this._delegate.handle(context);
                const usage = await this.usage(context);
                return this.handleError(new ErrorMessage(formatUsageObject(usage), 200), context);
            }
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
                if (this._action)
                    return result;
                return err;
            }).catch(result =>
            {
                if (this._format)
                {
                    return this._format.handle(result, context).then((e) => { if (typeof e === 'undefined') throw result; return e; });
                }
                throw result;
            })
        }
    }
}

const mainRouter = new NamespaceMiddleware<{ help: boolean }>(null);

export default mainRouter;
