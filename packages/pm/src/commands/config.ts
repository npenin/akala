import * as cli from "@akala/cli";
import { CliContext } from "@akala/cli";
import State from '../state.js';

export default async function config(this: State, name: string, options: CliContext['options']): Promise<string[] | State['config']>
{
    // debugger;
    if (options)
    {
        const args = cli.unparseOptions(options);
        if (args[1] && args[1] == 'set')
        {
            this.config.containers[name] = args.slice(2);
            await this.config.save();
        }

        if (typeof name == 'undefined')
            return this.config;

        return this.config.containers[name];
    }
    else
        return this.config.containers[name];
}

exports.default.$inject = ['param.0', 'options']