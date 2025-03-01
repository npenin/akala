import { join } from 'path'
import { AkalaConfig, cli, loadConfig } from './cli.js'
import npm from './npm-helper.js'
import yarn, { hasYarn } from './yarn-helper.js'
import program, { buildCliContextFromContext } from './index.js';


export default function ()
{
    program.command('install').state<AkalaConfig>().option('configFile', { normalize: true, needsValue: true }).action(async context =>
    {
        const cwd = process.env.INIT_CWD || process.cwd();
        context.logger.info('setting cwd to ' + cwd)
        const configFile = join(cwd, './.akala.json')

        // const context = buildCliContextFromProcess<{ help: boolean, configFile: string }>(cliLogger, { plugins: [] });
        context.options.configFile = configFile;
        context.currentWorkingDirectory = cwd;
        await loadConfig(context)

        const processedContext = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala')

        const akala = cli();

        await program.process(processedContext);
        context.state = processedContext.state;
        await akala.process(buildCliContextFromContext(context, 'plugins', 'add', '@akala/commands/akala'))
        await akala.process(buildCliContextFromContext(context, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))

        context.logger.info('installing dependencies...');

        const xpm = await hasYarn() ? yarn : npm;

        await xpm.install('@akala/cli');
        await xpm.install('@akala/config');
        await xpm.install('@akala/commands');
    })

}
