import State from "../state";
import unparse from 'yargs-unparser';
import { writeFileSync } from "fs";
import { join } from "path";

export default async function config(this: State, name: string, options: any): Promise<string[]>
{
    debugger;
    if (options)
    {
        var args = unparse(options);
        if (!args[2])
        {
            return args;
            delete this.config.containers[name]
        }
        else if (args[2] == 'set')
        {
            writeFileSync(join(__dirname, './log.txt'), new Error().stack);
            this.config.containers[name] = args.slice(3);
            await this.config.save();
        }

        return this.config.containers[name];
    }
    else
        return this.config.containers[name];
};

exports.default.$inject = ['param.0', 'options']