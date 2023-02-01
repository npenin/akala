import { InjectableWithTypedThis } from "@akala/core";
import { ICommandProcessor } from './processor.js';
import * as metadata from '../metadata/index.js'

type Injectable<T, U> = InjectableWithTypedThis<T, U> & { '$inject'?: string[] }

export interface CommandWithProcessorAffinity extends metadata.Command
{
    processor: ICommandProcessor;
}

export class SelfDefinedCommand<T = unknown> implements metadata.Command
{
    constructor(public readonly handler: Injectable<unknown | PromiseLike<unknown>, T>, name?: string, inject?: string[])
    {
        this.name = name || handler.name;
        if (typeof inject == 'undefined')
            inject = handler['$inject'];
        if (typeof inject == 'undefined' && handler.length)
        {
            inject = [];
            for (let i = 0; i < handler.length; i++)
            {
                inject.push('param.' + i);
            }
        }
        this.inject = inject || [];
    }

    public get inject(): string[] 
    {
        return this.config[''].inject;
    }

    public set inject(value: string[] | undefined)
    {
        this.config[''].inject = value;
    }

    public readonly name: string;
    public config: metadata.Configurations = { '': {} };

}

// export class CommandProxy<TState = unknown> extends Command<TState>
// {
//     constructor(public processor: Processor, name: string, inject?: string[])
//     {
//         super((_trigger, ...args) =>
//         {
//             if (this.inject && this.inject.length == 1 && this.inject[0] == '$param')
//             {
//                 if (processor.requiresCommandName)
//                     return processor.handle(name, args[0]).then(err => { throw err }, result => result);
//                 else
//                     return processor.handle(this, args[0]).then(err => { throw err }, result => result);
//             }

//             if (processor.requiresCommandName)
//                 return processor.handle(name, { param: args }).then(err => { throw err }, result => result);
//             else
//                 return processor.handle(this, { _trigger: 'proxy', param: args }).then(err => { throw err }, result => result);
//         }, name, inject);
//     }

//     public get inject(): string[]
//     {
//         return super.inject || this.config[this.processor.name] && this.config[this.processor.name]?.inject;
//     }

//     public set inject(value: string[] | undefined)
//     {
//         super.inject = ['_trigger'].concat(value);
//     }
// }

// export class MapCommand extends Command<unknown>
// {
//     constructor(public container: Container<unknown>, commandToTrigger: string, name: string, inject?: string[])
//     {
//         super(function (...args)
//         {
//             container.dispatch(commandToTrigger, { param: args });
//         }, name, inject);
//     }
// }