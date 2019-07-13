import * as akala from '@akala/core'
import { escapeRegExp } from '@akala/core/dist/reflect';
import { LayerRegExp, Layer } from '@akala/core/dist/router/layer';
import { Key } from 'path-to-regexp';
import { URL } from 'url';

export interface CliContext
{
    args: string[];
    argv: string[];
    options?: { [key: string]: string | boolean | string[] };
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
        if (this.keys.length)
            this.name = this.keys[0].name.toString();
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
        return CliRouter.getAsCli(req.args);
    }

    public static getAsCli(args: string[])
    {
        return args.map(function (v)
        {
            if (~v.indexOf('"'))
                return '"' + v + '"';
            return v;
        }).join(' ')
    }

    public command(path: string)
    {
        var cmd = new Command(this.injector);

        var layer = this.layer(path, function (context)
        {
            cmd.request = context;
            cmd._action.apply(null, Array.from(arguments));
        });

        layer.isApplicable = function (context, route)
        {
            cmd.request = context;
            return !context.options || !Object.keys(context.options).filter(function (optionName)
            {
                return !cmd.options.find(function (option)
                {
                    return option.matches(context);
                })
            }).length;
        }

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
            args: argv,
            options: {}
        }, function (err)
        {
            if (err)
                console.error(err);
        });
    }
}

class Option
{
    public names: { name: string, pattern: RegExp }[] = [];
    public single: boolean = true;
    public args: LayerRegExp & { keys: Key[] };

    constructor(specification: string, private description: string, private defaultValue: any)
    {
        var followingArgs = specification.replace(/(?:^|[\|, ]+)-(-)?([^ ]+)(?:[^<\[])?/g, (match, doubleDash, name) =>
        {
            if (doubleDash)
                this.names.push({ name: name, pattern: new RegExp('^--' + escapeRegExp(name) + '$') });
            else
                this.names.push({ name: name, pattern: new RegExp('^-' + escapeRegExp(name) + '$') });
            return '';
        });

        if (followingArgs.length > 0)
        {
            let keys = [];
            this.args = cliToRegexp(followingArgs, keys) as any;
            if (keys.length == 1 && keys[0].variadic)
                this.single = false;
        }
    }

    public matches(context: CliContext)
    {
        var optionValues = this.names.filter((nameSpec) =>
        {
            if (typeof (this.defaultValue) != 'undefined')
                context.options[nameSpec.name] = this.defaultValue;
            return context.args.find(nameSpec.pattern.test.bind(nameSpec.pattern));
        });

        if (optionValues.length == 0)
            return false;

        if (optionValues.length > 1 && this.single)
            return false;

        let indexesToRemove: number[];

        for (let i = 0; i < context.args.length; i++)
        {
            for (let j = 0; j < this.names.length; j++)
            {
                if (this.names[j].pattern.test(context.args[i]))
                {
                    if (this.args)
                    {
                        var match = CliRouter.getAsCli(context.args.slice(i + 1, this.args.keys.length + i + 1)).match(this.args);
                        if (!match)
                            continue;
                        indexesToRemove.push(i);
                        for (let x = i + 1; x < this.args.keys.length + x + 1; x++)
                            indexesToRemove.push(x);

                        if (typeof (context.options[this.names[j].name]) == 'undefined' && !this.single)
                            context.options[this.names[j].name] = [];

                        if (this.single)
                            context.options[this.names[j].name] = match[1];
                        else
                            (context.options[this.names[j].name] as string[]).push(match[1]);

                        i += this.args.keys.length + 1;
                        j = -1;
                    }
                    else
                    {
                        context.options[this.names[j].name] = true;
                        indexesToRemove.push(i);
                        i++;
                        j = -1;
                    }
                }
            }
        }

        for (let i = 0; i < indexesToRemove.length; i++)
        {
            context.args.splice(i, 1);
        }
    }
}

const masterPrefixes = ['param', 'option']

class Command extends akala.Injector implements ICommandBuilder
{
    constructor(injector?: akala.Injector)
    {
        super(injector);
    }

    public request?: CliContext & akala.Request;

    public resolve<T = any>(name: string): T
    {
        let indexOfDot = name.indexOf('.');

        if (indexOfDot > -1)
        {
            let master = name.substr(0, indexOfDot);
            if (master in masterPrefixes)
            {
                switch (master)
                {
                    case 'param':
                        return this.request.params && this.request.params[name.substr(indexOfDot + 1)] as any;
                    case 'option':
                        return this.request.options && this.request.options[name.substr(indexOfDot + 1)] as any;
                }
            }
        }
        return super.resolve<T>(name);
    }

    public name: string;
    public _action: cliHandlerWithNext;
    public options: Option[] = [];
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

    public option(spec: string, description: string, defaultValue: any)
    {
        this.options.push(new Option(spec, description, defaultValue));
        return this;
    }

    public command(cmd: string): Command
    {
        if (!this.subCommands)
            this.subCommands = new CliRouter(this);
        if (!this._action)
            this.action((context, next) =>
            {
                this.request = context;
                if (this.options.length)
                {
                    this.options.forEach(function (option)
                    {
                        option.matches(context);
                    });
                }
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

    if (cli == '*')
    {
        regexp = '^.*$';
    }
    else
    {
        regexp = cli.replace(/( ?)([<\[])?(\.{3})?([-\w]+)[>\]]?/g, function (m, space, argcase, variadic, name)
        {
            switch (argcase)
            {
                case '[':
                    if (space)
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: true, delimiter: ' ', pattern: '(?: +([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+")))?' });
                    else
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: true, delimiter: ' ', pattern: '([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))?' });
                    break;
                case '<':
                    if (space)
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, delimiter: ' ', pattern: ' +([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))' });
                    else
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, delimiter: ' ', pattern: '([^\\s]+|(?:"(?:[^"\\\\]|(?:\\\\[^"])|(?:\\\\""))+"))' });
                    break;
                default:
                    if (space)
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, delimiter: ' ', pattern: ' +(' + escapeRegExp(name) + ')' });
                    else
                        keys.push({ name: name, repeat: !!variadic, prefix: null, optional: false, delimiter: ' ', pattern: '(' + escapeRegExp(name) + ')' });
                    break;
            }
            return keys[keys.length - 1].pattern;
        });
    }

    if (options && options.end)
        regexp += '(?=\/|$)';
    var result: LayerRegExp & { keys: Key[] };
    result = new RegExp(regexp, flags) as any;
    if (regexp == '^.*$')
    {
        result.fast_star = true;
    }
    result.keys = keys;
    return result;
}

var mainRouter = new CliRouter();
var cmd = mainRouter.command('*');

cmd.option('--url', 'remote url of akala server', 'http://localhost:5678/')
cmd['cliToRegexp'] = cliToRegexp;
cmd['process'] = function (argv: string[])
{

    akala.register('$resolveUrl',
        function resolveUrl(namespace: string)
        {
            return new URL(namespace, cmd.request.options['url'] as string).toString();
        }, true);
    mainRouter.process(argv);
}

export default cmd as Command & { process(args: string[]) };