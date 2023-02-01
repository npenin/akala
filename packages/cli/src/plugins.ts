import program from './router/index.js';
import { resolve } from 'path';


program.command('plugins').command<{ name: string, path: string }>('add <name> <path>')
    .action(async function (context)
    {
        program.process({ args: ['config', 'set', 'plugins.' + context.options.name, resolve(context.options.path)], argv: [], options: {}, currentWorkingDirectory: undefined, logger: context.logger });
    })