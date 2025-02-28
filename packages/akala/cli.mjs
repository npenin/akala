import { writeFile } from 'fs/promises';
import { join } from 'path'
import { cli } from '@akala/cli/cli'
import { buildCliContextFromContext, buildCliContextFromProcess, program } from '@akala/cli';
import { logger, LogLevels } from '@akala/core';
import npm from '@akala/cli/npm-helper'
import yarn, { hasYarn } from '@akala/cli/yarn-helper'

const cliLogger = logger('akala', LogLevels.info)

const cwd = process.env.INIT_CWD || process.cwd();
cliLogger.info('setting cwd to ' + cwd)
const configFile = join(cwd, './.akala.json')

const context = buildCliContextFromProcess(cliLogger, { plugins: [] });
context.options = configFile;
context.currentWorkingDirectory = cwd;

try
{
    await writeFile(configFile, JSON.stringify({ plugins: [] }), { flag: 'wx' })
}
catch (e) { }

const processedContext = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala')

const akala = cli();

await program.process(processedContext);
await akala.process(buildCliContextFromContext(processedContext, 'plugins', 'add', '@akala/commands/akala'))
await akala.process(buildCliContextFromContext(processedContext, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))

cliLogger.info('installing dependencies...');

const xpm = await hasYarn() ? yarn : npm;

await xpm.install('@akala/cli');
