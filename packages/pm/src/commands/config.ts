import State from "../state";
import unparse from 'yargs-unparser';

export default async function config(this: State, name: string, options: unparse.Arguments): Promise<string[]>
{
    debugger;
    if (options)
    {
        var args = unparse(options);
        if (args[1] && args[1] == 'set')
        {
            this.config.containers[name] = args.slice(2);
            await this.config.save();
        }

        if (typeof name == 'undefined')
            return this.config as any;

        return this.config.containers[name];
    }
    else
        return this.config.containers[name];
};

exports.default.$inject = ['param.0', 'options']