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

    const cwd = process.env.INIT_CWD || process.cwd();
    cliLogger.info('setting cwd to ' + cwd)
    const configFile = join(cwd, './.akala.json')

    function getCliContext(...args)
    {
        const context = buildCliContext(cliLogger, ...args);
        context.currentWorkingDirectory = cwd;
        context.options.configFile = configFile;

        return context;
    }


    try
    {
        await writeFile(configFile, JSON.stringify({ plugins: [] }), { flag: 'wx' })
    }
    catch (e) { }

    await akala.process(getCliContext('plugins', 'add', '@akala/config/akala'))
    await akala.process(getCliContext('plugins', 'add', '@akala/commands/akala'))
    await akala.process(getCliContext('commands', 'add', 'sdk', '@akala/commands/commands.json'))
}
