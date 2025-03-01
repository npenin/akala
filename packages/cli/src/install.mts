import npm from './npm-helper.js'
import yarn, { hasYarn } from './yarn-helper.js'
import program, { buildCliContextFromContext } from './index.js';
import { AkalaConfig } from './cli.js';


export default async function (config, mainProgram)
{
    const xpm = await hasYarn() ? yarn : npm;

    program.state<AkalaConfig>().command<{ name: string }>('install [name]').option<string, 'configFile'>('configFile', { normalize: true, needsValue: true }).action(async context =>
    {
        switch (context.options.name)
        {
            default:
            case undefined:
                const options = context.options;
                context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala');
                context.options = { ...options };
                await mainProgram.process(context);

                context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/commands/akala');
                context.options = { ...options };
                await mainProgram.process(context);

                context = buildCliContextFromContext(context, 'commands', 'add', 'sdk', '@akala/commands/commands.json');
                context.options = { ...options };
                await mainProgram.process(context);


                context.logger.info('installing dependencies...');


                await xpm.install('@akala/cli');
                await xpm.install('@akala/config');
                await xpm.install('@akala/commands');
                break;
            case 'client':
                if (!('extract' in context.state))
                {
                    context.logger.warn('Please first install akala');
                    return;
                }
                await xpm.install('@akala/client');

                context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/client/akala');
                context.options = { ...options };
                await mainProgram.process(context);

                break;
        }
    })

}
