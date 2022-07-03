import * as cli from "@akala/cli";
import { CliContext } from "@akala/cli";
import State from '../state';

export default async function config(this: State, name: string | undefined | void, options: CliContext['options'] | undefined | void): Promise<string[] | State['config'] | State['config']['containers']['']>
{
    // debugger;
    if (options)
    {
        const args = cli.unparseOptions(options);

        if (typeof name == 'undefined')
            return this.config;

        if (args[1] && args[1] == 'set')
        {
            this.config.mapping[name].set('cli', args.slice(2));
            await this.config.commit();
        }

        return this.config.containers[name];
    }
    else if (typeof name !== 'undefined')
        return this.config.containers[name];
    else
        return this.config;
}

exports.default.$inject = ['param.0', 'options']