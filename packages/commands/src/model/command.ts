import { InjectableWithTypedThis, InjectMap, Resolvable } from "@akala/core";
import { ICommandProcessor } from './processor.js';
import { Command } from '../metadata/command.js'
import { Configurations } from '../metadata/configurations.js'

type Injectable<T, U, TArgs extends unknown[]> = InjectableWithTypedThis<T, U, TArgs> & { '$inject'?: string[] }

export interface CommandWithProcessorAffinity extends Command
{
    processor: ICommandProcessor;
}

export class SelfDefinedCommand<TArgs extends unknown[], T = unknown> implements Command
{
    constructor(public readonly handler: Injectable<unknown | PromiseLike<unknown>, T, TArgs>, name?: string, inject?: Exclude<Resolvable, symbol>[])
    {
        this.name = name || handler.name;
        if (typeof inject == 'undefined')
            inject = handler['$inject'];
        if (typeof inject == 'undefined' && handler.length)
        {
            inject = [];
            for (let i = 0; i < handler.length; i++)
            {
                inject.push('params.' + i);
            }
        }
        this.inject = inject || [];
    }

    public get inject(): Resolvable[] | InjectMap<any>
    {
        return this.config[''].inject;
    }

    public set inject(value: InjectMap<any> | Resolvable[] | undefined)
    {
        this.config[''].inject = value;
    }

    public name: string;
    public config: Configurations = { '': {} };

}

// export class MapCommand extends Command<unknown>
// {
//     constructor(public container: Container<unknown>, commandToTrigger: string, name: string, inject?: string[])
//     {
//         super(function (...args)
//         {
//             container.dispatch(commandToTrigger, { params: args });
//         }, name, inject);
//     }
// }
