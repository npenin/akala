import { writeFile } from 'fs/promises';
import { join } from 'path'
import { cli as akala } from '@akala/cli/cli'
import { buildCliContext, buildCliContextFromContext, program } from '@akala/cli';
import { logger, LogLevels } from '@akala/core';
import npm from '@akala/cli/npm-helper'
import yarn, { hasYarn } from '@akala/cli/yarn-helper'

const cliLogger = logger('akala', LogLevels.info)


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

const processedContext = getCliContext('plugins', 'add', '@akala/config/akala')

await program.process(processedContext);
await akala.process(buildCliContextFromContext(processedContext, 'plugins', 'add', '@akala/commands/akala'))
await akala.process(buildCliContextFromContext(processedContext, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))

cliLogger.info('installing dependencies...');

const xpm = await hasYarn() ? yarn : npm;

await xpm.install('@akala/cli');
