import { join } from 'path'

if (process.env.NO_AKALAPOSTINSTALL != '1')
    await postinstall();

async function postinstall()
{
    const config = { plugins: [] };
    const akala = await import('@akala/cli/cli').then(x => x.cli(config));
    const { buildCliContextFromContext, buildCliContextFromProcess } = await import('@akala/cli');
    const { logger } = await import('@akala/core');
    const cliLogger = logger('akala')

    let context = buildCliContextFromProcess(cliLogger, config);
    cliLogger.info('setting cwd to ' + (process.env.INIT_CWD || process.cwd()))
    context.currentWorkingDirectory = process.env.INIT_CWD || process.cwd();
    context.options.configFile = join(context.currentWorkingDirectory, './.akala.json')

    await akala.process(context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala'))
    await akala.process(context = buildCliContextFromContext(context, 'plugins', 'add', '@akala/commands/akala'))
    await akala.process(context = buildCliContextFromContext(context, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))
}
