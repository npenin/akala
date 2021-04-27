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
                            value = true;
                    }
                    else
                    {
                        if (match[2])
                            value += match[2];
                        else if (this.options?.needsValue)
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
                            context.options[this.name] = path.resolve(context.currentWorkingDirectory, value.toString());
                        else
                            context.options[this.name] = value;
                }
                while ((match = matcher.pattern.exec(element)));
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

export class NamespaceMiddleware<TOptions extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>> extends akala.MiddlewareComposite<[CliContext<TOptions>]> implements akala.Middleware<[context: CliContext]>
{
    private _preAction: akala.Middleware<[CliContext<TOptions>]>;
    private _action: akala.Middleware<[CliContext<TOptions>]>;
    private readonly _option = new OptionsMiddleware();
    private _format: (result: unknown, context: CliContext<TOptions>) => void;

    constructor(name: string, private _cli?: akala.Middleware<[CliContext<TOptions>]>)
    {
        super(name);
        if (name && ~name.indexOf(' '))
            throw new Error('command name cannot contain a space');
    }

    public command<TOptions2 extends Record<string, string | boolean | string[] | number> = TOptions>(name: string): NamespaceMiddleware<TOptions2 & TOptions>
    {
        let middleware: NamespaceMiddleware<TOptions & TOptions2>;
        if (name !== null)
        {
            var cli = /([$_#\w-]+)(?: ([$_#\w-]+))*((?: (?:<\w+>))*(?: (?:\[\w+\]))*)/.exec(name);
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

            middleware = new NamespaceMiddleware(cli[1], akala.convertToMiddleware(function (context)
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
        }
        else
            middleware = new NamespaceMiddleware(null);
        super.useMiddleware(middleware);
        return middleware;
    }

    public preAction(handler: (context: CliContext<TOptions>) => Promise<void>): this
    {
        this._preAction = { async handle(c) { try { await handler(c) } catch (e) { return e } } };
        return this;
    }

    public action(handler: (context: CliContext<TOptions>) => Promise<unknown> | void)
    {
        this._action = akala.convertToMiddleware((...args) =>
        {
            var result = handler(...args);
            if (result && akala.isPromiseLike(result))
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
                    return err;
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
