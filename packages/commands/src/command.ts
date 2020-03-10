import { Trigger } from "./trigger";
import { Injector, InjectableWithTypedThis } from "@akala/core";
import { Processor } from "./processor";
import { Container } from "./container";
import * as metadata from './metadata'
import { Configurations } from "./metadata";

type Injectable<T, U> = InjectableWithTypedThis<T, U> & { '$inject'?: string[] }

export class Command<T = any> implements metadata.Command
{
    constructor(public readonly handler: Injectable<any | PromiseLike<any>, T>, name?: string, public inject?: string[])
    {
        this.name = name || handler.name;
        if (typeof inject == 'undefined')
            this.inject = handler['$inject'];
        if (typeof this.inject == 'undefined' && handler.length)
        {
            this.inject = [];
            for (let i = 0; i < handler.length; i++)
            {
                this.inject.push('param.' + i);
            }
        }
    }

    public readonly name: string;
    public config: Configurations = {};

    public $proxy(processor: Processor<T>)
    {
        return new CommandProxy<T>(processor, this.name, this.inject);
    }
}

export class CommandProxy<T = any> extends Command<T>
{
    constructor(public processor: Processor<T>, name: string, inject?: string[])
    {
        super(function (...args)
        {
            if (cmd.inject && cmd.inject.length == 1 && cmd.inject[0] == '$params')
            {
                if (processor.requiresCommandName)
                    return processor.process(name, args[0]);
                else
                    return processor.process(cmd, args[0]);
            }

            if (processor.requiresCommandName)
                return processor.process(name, { param: args });
            else
                return processor.process(cmd, { _trigger: 'proxy', param: args });
        }, name, inject);
        var cmd = this;
    }

    public get inject()
    {
        return super.inject || this.config[this.processor.name] && this.config[this.processor.name]?.inject;
    }

    public set inject(value: string[] | undefined)
    {
        super.inject = value;
    }
}

export class MapCommand extends Command<any>
{
    constructor(public container: Container<any>, commandToTrigger: string, name: string, inject?: string[])
    {
        super(function (...args)
        {
            container.dispatch(commandToTrigger, { param: args });
        }, name, inject);
    }
}