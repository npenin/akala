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
context.options.configFile = configFile;
context.currentWorkingDirectory = cwd;

try
{
    await writeFile(configFile, JSON.stringify({ plugins: [] }), { flag: 'wx' })
}
catch (e) { }

const processedContext = buildCliContextFromContext(context, 'plugins', 'add', '@akala/config/akala')

const akala = cli();

await program.process(processedContext);
context.state = processedContext.state;
await akala.process(buildCliContextFromContext(context, 'plugins', 'add', '@akala/commands/akala'))
await akala.process(buildCliContextFromContext(context, 'commands', 'add', 'sdk', '@akala/commands/commands.json'))

cliLogger.info('installing dependencies...');

const xpm = await hasYarn() ? yarn : npm;

await xpm.install('@akala/cli');
await xpm.install('@akala/config');
await xpm.install('@akala/commands');
