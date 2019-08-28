import { Trigger } from "./trigger";
import { Injector, InjectableWithTypedThis } from "@akala/core";
import { Processor, Processors } from "./processor";
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
            if (processor.requiresCommandName)
                processor.process(name, { param: args });
            else
                processor.process(cmd, { param: args });
        }, name, inject);
        var cmd = this;
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