import * as akala from '@akala/core'
import * as path from 'path'

export interface CliContext<TOptions extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>
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

const defaultOptionParseOption: OptionParseOption = { flagStart: '-', fullOptionStart: '--', valueAssign: '=' };

export interface OptionOptions
{
    aliases?: string[],
    needsValue?: boolean,
    caseSensitive?: boolean,
    normalize?: boolean;
}

class OptionMiddleware implements akala.Middleware<[context: CliContext]>
{
    matchers: { isFull: boolean; pattern: RegExp; }[];
    constructor(private readonly name: string, private options?: OptionOptions, parseOptions: OptionParseOption = defaultOptionParseOption)
    {
        if (!options)
            options = {};
        this.matchers = [name].concat(options?.aliases).map(n =>
        {
            if (n.length > 1)
                return {
                    isFull: true,
                    pattern: new RegExp('^' + parseOptions.fullOptionStart + akala.introspect.escapeRegExp(n) + '(?:' + parseOptions.valueAssign + '(.*))?$', options.caseSensitive ? 'i' : '')
                };

            return {
                isFull: false,
                pattern: new RegExp('^' + parseOptions.flagStart + '[^' + akala.introspect.escapeRegExp(n) + ']+([' + akala.introspect.escapeRegExp(n) + ']+)', options.caseSensitive ? 'i' : '')
            };
        });
    }

    handle(context: CliContext): akala.MiddlewarePromise
    {
        for (let index = 0; index < context.args.length; index++)
        {
            const element = context.args[index];

            for (let jndex = 0; jndex < this.matchers.length; jndex++)
            {
                const matcher = this.matchers[jndex];
                let match: RegExpExecArray;
                // eslint-disable-next-line no-cond-assign
                while (match = matcher.pattern.exec(element))
                {
                    var value = undefined;
                    if (matcher.isFull)
                    {
                        if (match[1])
                        {
                            value = match[1];
                            context.args.splice(index, 1);
                        }
                        else if (this.options.needsValue)
                        {
                            if (context.args.length == index + 1)
                                return Promise.resolve(new Error('No value was given for option ' + this.name));
                            value = context.args[index + 1];
                            context.args.splice(index, 2);
                        }
                        else
                            value = true;
                    }
                    else
                    {
                        if (match[1])
                            value = match[1];
                        else if (this.options.needsValue)
                            value = match[1].length;
                        else
                            value = true;
                        context.args.splice(index, 1);
                    }
                    if (!value)
                        if (this.options.normalize)
                            context.options[this.name] = path.resolve(context.currentWorkingDirectory, context.options[this.name].toString());
                }
                return Promise.resolve();
            }
        }
        return Promise.resolve();
    }
}

class OptionsMiddleware<TOptions extends Record<string, string | number | boolean | string[]>> implements akala.Middleware<[context: CliContext]>
{
    private options = new akala.MiddlewareComposite<[CliContext]>();

    option<TValue extends string | number | boolean | string[], TName extends string>(name: TName, option?: OptionOptions): OptionsMiddleware<TOptions & { [key in TName]: TValue }>
    {
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

export class NamespaceMiddleware<TOptions extends Record<string, string | boolean | string[] | number>> extends akala.MiddlewareComposite<[CliContext<TOptions>]> implements akala.Middleware<[context: CliContext]>
{
    private _preAction: akala.Middleware<[CliContext<TOptions>]>;
    private _action: akala.Middleware<[CliContext<TOptions>]>;
    private readonly _option = new OptionsMiddleware();

    constructor(name: string, private _cli?: akala.Middleware<[CliContext<TOptions>]>)
    {
        super(name);
        if (name && ~name.indexOf(' '))
            throw new Error('command name cannot contain a space');
    }

    public command<TOptions2 extends Record<string, string | boolean | string[] | number> = TOptions>(name: string): NamespaceMiddleware<TOptions2 & TOptions>
    {
        var cli = /(\w+)(?: (\w+))*((?: (?:<\w+>))*(?: (?:\[\w+\]))*)/.exec(name);
        if (!cli || cli[0].length != name.length)
            throw new Error(`${name} must match the following syntax: name <mandatoryparameters> [optionparameters].`)

        if (cli[2])
            return this.command(cli[1]).command<TOptions2>(cli[2] + cli[3]);

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

        var middleware = new NamespaceMiddleware<TOptions & TOptions2>(cli[1], akala.convertToMiddleware(function (context)
        {
            if (context.args.length < (~parameters.findIndex(p => p.optional) || parameters.length))
                throw new UsageError(name);

            for (let index = 0; index < parameters.length; index++)
            {
                const parameter = parameters[index];
                // if (!parameter.optional)
                context.options[parameter.name] = context.args.shift() as (TOptions & TOptions2)[typeof parameter.name];
                // if (parameter.optional)
                //     context.options[parameter.name] = context.args.shift() as TOptions2[typeof parameter.name];
            }
            return Promise.reject();
        }));
        super.useMiddleware(middleware);
        return middleware;
    }

    public preAction(handler: (context: CliContext<TOptions>) => Promise<void>)
    {
        this._preAction = akala.convertToMiddleware(handler);
    }

    public action(handler: (context: CliContext<TOptions>) => Promise<unknown> | void)
    {
        this._action = akala.convertToMiddleware((...args) =>
        {
            var result = handler(...args);
            if (result)
                if (akala.isPromiseLike(result))
                    return result;
            return Promise.resolve(result);

        });
    }

    options<T extends { [key: string]: string | number | boolean | string[] }>(options: { [key in Exclude<keyof T, number | symbol>]: OptionOptions }) 
    {
        akala.each(options, (o, key) =>
        {
            this.option<T[typeof key], typeof key>(key, o);
        });
        return this as NamespaceMiddleware<T>;
    }

    option<TValue extends string | number | boolean | string[] = string | number | boolean | string[], TName extends string = string>(name: TName, option?: OptionOptions)
        : NamespaceMiddleware<TOptions & { [key in TName]: TValue }>
    {
        this._option.option<TValue, TName>(name, option);
        return this as unknown as NamespaceMiddleware<TOptions & { [key in TName]: TValue }>;
    }

    async handle(context: CliContext<TOptions>): akala.MiddlewarePromise
    {
        var args = context.args.slice(0);
        if (this.name === null || context.args.shift() == this.name)
        {
            var error = await this._option.handle(context);
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
            return super.handle(context).then(err =>
            {
                if (!err && this._action)
                    return this._action.handle(context);
                context.args = args;
            })
        }
    }
}

const mainRouter = new NamespaceMiddleware(null);
const cmd = mainRouter;

export default cmd;
