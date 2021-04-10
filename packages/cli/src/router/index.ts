import * as akala from '@akala/core'

export interface CliContext<TOptions extends Record<string, string | boolean | string[] | number> = Record<string, string | boolean | string[] | number>>
{
    args: string[];
    argv: string[];
    options: TOptions
    commandPath?: string;
}

type cliHandlerWithNext = akala.Middleware<[context: CliContext]>;

interface OptionParseOption
{
    flagStart: string;
    fullOptionStart: string;
    valueAssign: string;
}

const defaultOptionParseOption: OptionParseOption = { flagStart: '-', fullOptionStart: '--', valueAssign: '=' };

interface OptionOptions
{
    aliases?: string[],
    needsValue?: boolean,
    caseSensitive?: boolean,
}

class OptionMiddleware implements cliHandlerWithNext
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
                const match = matcher.pattern.exec(element);
                if (match)
                {
                    if (matcher.isFull)
                    {
                        if (match[1])
                        {
                            context.options[this.name] = match[1];
                            context.args.splice(index, 1);
                        }
                        else if (this.options.needsValue)
                        {
                            if (context.args.length == index + 1)
                                return Promise.resolve(new Error('No value was given for option ' + this.name));
                            context.options[this.name] = context.args[index + 1];
                            context.args.splice(index, 2);
                        }
                    }
                    else
                    {
                        if (match[1])
                            context.options[this.name] = match[1];
                        else if (this.options.needsValue)
                            context.options[this.name] = match[1].length;
                        else
                            context.options[this.name] = true;
                        context.args.splice(index, 1);
                    }
                    return Promise.resolve();
                }
            }
        }
        return Promise.resolve();
    }
}

class OptionsMiddleware implements cliHandlerWithNext
{
    private options = new akala.MiddlewareComposite<[CliContext]>();

    option(name: string, option?: OptionOptions)
    {
        return this.optionMiddleware(new OptionMiddleware(name, option));
    }

    optionMiddleware(middleware: OptionMiddleware): this
    {
        this.options.useMiddleware(middleware);
        return this;
    }

    handle(context: CliContext): akala.MiddlewarePromise
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

class NamespaceMiddleware<TOptions extends Record<string, string | boolean | string[] | number>> extends akala.MiddlewareComposite<[CliContext<TOptions>]> implements cliHandlerWithNext
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

    public command<TOptions2 extends TOptions = TOptions>(name: string): NamespaceMiddleware<TOptions2>
    {
        var cli = /(\w+)(?: (\w+))*((?: (?:<\w+>))*(?: (?:\[\w+\]))*)/.exec(name);
        if (!cli || cli[0].length != name.length)
            throw new Error(`${name} must match the following syntax: name <mandatoryparameters> [optionparameters].`)

        if (cli[2])
            return this.command(cli[1]).command(cli[2] + cli[3]);

        var args = cli[3];
        var parameters: { name: keyof TOptions2, optional: boolean }[] = [];
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

        var middleware = new NamespaceMiddleware<TOptions2>(cli[1], akala.convertToMiddleware(function (context)
        {
            if (context.args.length < (~parameters.findIndex(p => p.optional) || parameters.length))
                throw new UsageError(name);

            for (let index = 0; index < parameters.length; index++)
            {
                const parameter = parameters[index];
                // if (!parameter.optional)
                context.options[parameter.name] = context.args.shift() as TOptions2[typeof parameter.name];
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


    option(name: string, option?: OptionOptions)
    {
        this._option.option(name, option);
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
