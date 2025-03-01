import npm from './npm-helper.js'
import yarn, { hasYarn } from './yarn-helper.js'
import program, { buildCliContextFromContext } from './index.js';


export default function (config, mainProgram)
{
    program.command('install').option('configFile', { normalize: true, needsValue: true }).action(async context =>
    {
        await mainProgram.process(context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala'));
        await mainProgram.process(buildCliContextFromContext(context, 'plugins', 'add', '@akala/commands/akala'));
        await mainProgram.process(buildCliContextFromContext(context, 'commands', 'add', 'sdk', '@akala/commands/commands.json'));

        context.logger.info('installing dependencies...');

        const xpm = await hasYarn() ? yarn : npm;

        await xpm.install('@akala/cli');
        await xpm.install('@akala/config');
        await xpm.install('@akala/commands');
    })

}
