import * as akala from '@akala/core'
import * as commander from 'commander'
import { escapeRegExp } from '@akala/core/dist/reflect';
import { LayerRegExp, Layer } from '@akala/core/dist/router/layer';
import { Key } from 'path-to-regexp';

export interface CliContext
{
    args: string[];
    argv: string[];
    options?: { [key: string]: string | boolean };
    commandPath?: string;
}

export interface ICommandBuilder
{
    command(cmd: string): Command;
}

type cliHandlerWithNext = akala.Middleware1<CliContext & akala.Request>;
type errorHandlerWithNext = akala.ErrorMiddleware1<CliContext & akala.Request>;

class CliLayer extends akala.Layer<cliHandlerWithNext> implements akala.IRoutable<cliHandlerWithNext>
{
    constructor(path: string, options: akala.LayerOptions, handler: cliHandlerWithNext)
    {
        super(path, akala.extend({ length: 1 }, options), handler);
        this.regexp = cliToRegexp(path, this.keys = [], options);
        this.name = this.keys[0];
    }

    public isApplicable(req: CliContext & Request, route): boolean
    {
        return true;
    }

    public route: akala.Route<cliHandlerWithNext, akala.Layer<cliHandlerWithNext>>;
}

class CliRoute extends akala.Route<cliHandlerWithNext, CliLayer>
{
    constructor(path: string)
    {
        super(path);
    }
    public isApplicable(req: { method: string })
    {
        return true
    }
}

class CliRouter extends akala.Router<cliHandlerWithNext, errorHandlerWithNext, CliLayer, CliRoute> implements ICommandBuilder
{
    constructor(private injector?: akala.Injector)
    {
        super({ separator: ' ' });
    }

    protected buildLayer(path: string, options: akala.LayerOptions, handler: cliHandlerWithNext)
    {
        return new CliLayer(path, options, handler);
    }

    protected buildRoute(path: string)
    {
        return new CliRoute(path);
    }

    getPathname(req)
    {
        if (req.url)
            return req.url;
        return req.args.map(function (v)
        {
            if (~v.indexOf('"'))
                return '"' + v + '"';
            return v;
        }).join(' ');
    }

    public command(path: string)
    {
        var cmd = new Command(this.injector);

        var layer = this.layer(path, function ()
        {
            cmd._action.apply(null, Array.from(arguments));
        });

        cmd.name = layer.name;

        return cmd;
    }

    protected shift(req, removed)
    {
        if (removed == req.args[0])
        {
            req.args.shift();
        }
    }

    protected unshift(req, removed)
    {
        req.args.unshift(removed);
    }

    public handle(context, next)
    {
        this.internalHandle({
            ensureCleanStart: function ()
            {
            }
        }, context, next);
    }

    public process(argv: string[])
    {
        this.handle({
            argv: argv,
            args: argv
        }, function (err)
            {
                if (err)
                    console.error(err);
            });
    }
}

class Command extends akala.Injector implements ICommandBuilder
{
    constructor(injector?: akala.Injector)
    {
        super(injector);
    }

    public name: string;
    public _action: cliHandlerWithNext;
    public options: commander.Option[] = [];
    private subCommands: CliRouter;

    public handler: cliHandlerWithNext;

    public action(action: cliHandlerWithNext)
    {
        this._action = action;
        return this;
    }

    public config(configName: string)
    {
        this.registerFactory('$config', () =>
        {
            return this.parent.resolve<Promise<any>>('$config').then((config) =>
            {
                return config[configName];
            })
        });

        this.register('$updateConfig', (value, key) =>
        {
            return this.parent.resolve('$updateConfig')(value, configName + '.' + key);
        });

        return this;
    }

    public option(spec: string, description?: string)
    {
        this.options.push(new commander.Option(spec, description));
        return this;
    }

    public command(cmd: string): Command
    {
        if (!this.subCommands)
            this.subCommands = new CliRouter(this);
        if (!this._action)
            this.action((context, next) =>
            {
                this.subCommands.handle(context, next);
            });
        return this.subCommands.command.apply(this.subCommands, Array.from(arguments));
    }
}

function cliToRegexp(cli: string, keys: Key[], options?: akala.LayerOptions): LayerRegExp
{
    var flags: string = undefined;
    var regexp = '^';
    if (options && options.sensitive)
        flags += 'i';

    regexp = cli.replace(/( ?)([<\[])?(\.{3})?([-\w]+)[>\]]?/g, function (m, space, argcase, variadic, name)
    {
        switch (argcase)
        {
            case '[':
                if (space)
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: true, asterisk: false, delimiter: ' ', partial: false, pattern: '(?: +([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+")))?' });
                else
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: true, asterisk: false, delimiter: ' ', partial: false, pattern: '([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))?' });
                break;
            case '<':
                if (space)
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, asterisk: false, delimiter: ' ', partial: false, pattern: ' +([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))' });
                else
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, asterisk: false, delimiter: ' ', partial: false, pattern: '([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))' });
                break;
            default:
                if (space)
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, asterisk: false, delimiter: ' ', partial: false, pattern: ' +(' + escapeRegExp(name) + ')' });
                else
                    keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, asterisk: false, delimiter: ' ', partial: false, pattern: '(' + escapeRegExp(name) + ')' });
                break;
        }
        return keys[keys.length - 1].pattern;
    });

    if (options && options.end)
        regexp += '(?=\/|$)';
    var result: LayerRegExp = new RegExp(regexp, flags) as any;
    result.keys = keys;
    return result;
}

var mainRouter = new CliRouter();

mainRouter['cliToRegexp'] = cliToRegexp;

export default mainRouter;