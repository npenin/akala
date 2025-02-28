import { writeFile } from 'fs/promises';
import { join } from 'path'

if (process.env.NO_AKALAPOSTINSTALL != '1')
    await postinstall();

async function postinstall()
{
    const akala = await import('@akala/cli/cli').then(x => x.cli());
    const { buildCliContext } = await import('@akala/cli');
    const { logger } = await import('@akala/core');
    const cliLogger = logger('akala')

    cliLogger.info('setting cwd to ' + (process.env.INIT_CWD || process.cwd()))

    function getCliContext(...args)
    {
        const context = buildCliContext(cliLogger, ...args);
        context.currentWorkingDirectory = process.env.INIT_CWD || process.cwd();
        context.options.configFile = join(context.currentWorkingDirectory, './.akala.json')

        return context;
    }


    try
    {
        await writeFile(context.options.configFile, JSON.stringify({ plugins: [] }), { flag: 'wx' })
    }
    catch (e) { }

    await akala.process(getCliContext('plugins', 'add', '@akala/config/akala'))
    await akala.process(getCliContext('plugins', 'add', '@akala/commands/akala'))
    await akala.process(getCliContext('commands', 'add', 'sdk', '@akala/commands/commands.json'))
}
